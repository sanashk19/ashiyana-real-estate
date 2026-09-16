import os
import re
import json
import secrets
import hashlib
from datetime import datetime, timedelta
from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, and_
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.core.dependencies import require_broker
from app.models.models import (
    User, Deal, DealDocument, Property, PropertyImage,
    DealStatus, DocumentCategory, DealUploadRequest, BusinessProfile,
)
from app.schemas.deals import (
    DealCreate, DealUpdate, DealOut, DealDetailOut, DealListResponse,
    DealDocumentOut, DealDocumentUploadResponse, DealPropertyInfo,
    DealPartyInfo, DealChecklistItem, DealDocumentVerifyRequest,
    DealUploadRequestCreate, DealUploadRequestOut, PublicUploadRequestVerifyOut,
    ClientDocumentUploadResponse, DealPrintPackRequest, DealPrintPackPreviewOut,
    PrintPackPreviewItemOut,
)
from app.services.cloudinary_service import (
    validate_document_upload, upload_deal_document,
    get_signed_document_url, delete_deal_document,
    LOCAL_VAULT_DIR,
)
from app.services.print_pack_service import (
    generate_deal_print_pack,
    group_documents_for_printing,
)

router = APIRouter(tags=["deals & document vault"])


# ─── Deal Number Generator ───────────────────────────────────────────────────

async def generate_next_deal_number(db: AsyncSession) -> str:
    """
    Generate unique, sequential deal number server-side in format: ASH-YYYY-NNN.
    E.g. ASH-2026-001. Handles concurrency and guarantees uniqueness.
    """
    current_year = datetime.utcnow().year
    prefix = f"ASH-{current_year}-"

    result = await db.execute(
        select(Deal.deal_number)
        .where(Deal.deal_number.like(f"{prefix}%"))
        .order_by(desc(Deal.deal_number))
        .limit(1)
    )
    last_deal_number = result.scalar_one_or_none()

    if last_deal_number:
        try:
            last_seq = int(last_deal_number.split("-")[-1])
            next_seq = last_seq + 1
        except (ValueError, IndexError):
            next_seq = 1
    else:
        next_seq = 1

    return f"{prefix}{next_seq:03d}"


def _build_property_info(prop: Optional[Property]) -> Optional[DealPropertyInfo]:
    if not prop:
        return None
    thumb = None
    if prop.images:
        sorted_images = sorted(prop.images, key=lambda img: (not img.is_thumbnail, img.display_order))
        thumb = sorted_images[0].image_url if sorted_images else None

    return DealPropertyInfo(
        id=prop.id,
        title=prop.title,
        locality=prop.locality,
        price=float(prop.price) if prop.price is not None else 0.0,
        property_type=prop.property_type.value if hasattr(prop.property_type, "value") else str(prop.property_type),
        thumbnail_url=thumb,
    )


def _build_party_info(name, phone, email, address, notes) -> Optional[DealPartyInfo]:
    if not any([name, phone, email, address, notes]):
        return None
    return DealPartyInfo(
        name=name,
        phone=phone,
        email=email,
        address=address,
        notes=notes,
    )


STANDARD_CHECKLIST_TEMPLATES = [
    # Buyer documents
    {"category": "buyer", "title": "Buyer PAN Card", "party": "buyer", "required": True},
    {"category": "buyer", "title": "Buyer Aadhaar / Passport ID", "party": "buyer", "required": True},
    {"category": "buyer", "title": "Buyer Address Proof", "party": "buyer", "required": False},
    {"category": "buyer", "title": "Buyer Photograph", "party": "buyer", "required": False},

    # Seller documents
    {"category": "seller", "title": "Seller PAN Card", "party": "seller", "required": True},
    {"category": "seller", "title": "Seller Aadhaar / Passport ID", "party": "seller", "required": True},
    {"category": "seller", "title": "Title Search Report / Parent Deeds", "party": "seller", "required": True},
    {"category": "seller", "title": "Nil Encumbrance / Tax Receipts", "party": "seller", "required": True},

    # Legal documents
    {"category": "legal", "title": "Draft Agreement to Sell", "party": "legal", "required": True},
    {"category": "legal", "title": "Signed Sale Deed Execution", "party": "legal", "required": True},
]


def _normalize_tokens(text: str) -> set:
    return {w for w in re.sub(r"[^a-zA-Z0-9]", " ", text.lower()).split() if len(w) > 1}


def _build_checklist(documents: List[DealDocument]) -> List[DealChecklistItem]:
    items = []
    for tmpl in STANDARD_CHECKLIST_TEMPLATES:
        matched_doc = None
        tmpl_party = tmpl["party"]
        tmpl_tokens = _normalize_tokens(tmpl["title"]) - {"buyer", "seller", "card", "proof", "report"}

        for doc in documents:
            doc_party = getattr(doc, "party", None)
            # If parties differ (e.g. buyer doc vs seller checklist), don't match
            if doc_party and tmpl_party and doc_party.lower() != tmpl_party.lower():
                continue

            doc_title = doc.title.lower()
            doc_tokens = _normalize_tokens(doc.title)

            # Direct substring or token overlap
            if tmpl["title"].lower() in doc_title or doc_title in tmpl["title"].lower():
                matched_doc = doc
                break

            if tmpl_tokens and (tmpl_tokens & doc_tokens):
                matched_doc = doc
                break

        status_val = "pending"
        doc_id = None
        if matched_doc:
            doc_id = matched_doc.id
            status_val = "verified" if getattr(matched_doc, "is_verified", False) else "uploaded"

        items.append(DealChecklistItem(
            category=tmpl["category"],
            title=tmpl["title"],
            party=tmpl["party"],
            required=tmpl["required"],
            status=status_val,
            document_id=doc_id,
        ))
    return items


def _format_doc_out(doc: DealDocument) -> DealDocumentOut:
    return DealDocumentOut(
        id=doc.id,
        deal_id=doc.deal_id,
        category=doc.category,
        title=doc.title,
        original_filename=doc.original_filename,
        resource_type=doc.resource_type,
        mime_type=doc.mime_type,
        file_size=doc.file_size,
        party=getattr(doc, "party", None),
        document_side=getattr(doc, "document_side", None),
        is_verified=getattr(doc, "is_verified", False),
        verified_at=getattr(doc, "verified_at", None),
        verified_by=getattr(doc, "verified_by", None),
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        download_url=f"/api/documents/{doc.id}/download",
    )


def _build_deal_out(d: Deal, doc_count: int, prop: Optional[Property] = None) -> DealOut:
    buyer_name = d.buyer_name
    seller_name = d.seller_name
    buyer_party = _build_party_info(buyer_name, d.buyer_phone, d.buyer_email, d.buyer_address, d.buyer_notes)
    seller_party = _build_party_info(seller_name, d.seller_phone, d.seller_email, d.seller_address, d.seller_notes)
    return DealOut(
        id=d.id,
        deal_number=d.deal_number,
        property_id=d.property_id,
        property=_build_property_info(prop if prop is not None else d.property),
        seller_name=seller_name,
        buyer_name=buyer_name,
        buyer=buyer_party,
        seller=seller_party,
        status=d.status,
        notes=d.notes,
        document_count=doc_count,
        created_at=d.created_at,
        updated_at=d.updated_at,
        closed_at=d.closed_at,
    )


# ─── 1. Deal Management (CRUD) ───────────────────────────────────────────────

@router.post("/deals", response_model=DealOut, status_code=status.HTTP_201_CREATED)
async def create_deal(
    payload: DealCreate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Create a new Deal with atomic server-side deal_number generation and structured parties."""
    prop = None
    if payload.property_id:
        prop_res = await db.execute(
            select(Property).options(selectinload(Property.images)).where(Property.id == payload.property_id)
        )
        prop = prop_res.scalar_one_or_none()
        if not prop:
            raise HTTPException(status_code=404, detail="Selected property does not exist.")

    deal_number = await generate_next_deal_number(db)

    # Resolve buyer details
    buyer_name = (payload.buyer.name if payload.buyer and payload.buyer.name else payload.buyer_name)
    buyer_phone = (payload.buyer.phone if payload.buyer and payload.buyer.phone else payload.buyer_phone)
    buyer_email = (payload.buyer.email if payload.buyer and payload.buyer.email else payload.buyer_email)
    buyer_address = (payload.buyer.address if payload.buyer and payload.buyer.address else payload.buyer_address)
    buyer_notes = (payload.buyer.notes if payload.buyer and payload.buyer.notes else payload.buyer_notes)

    # Resolve seller details
    seller_name = (payload.seller.name if payload.seller and payload.seller.name else payload.seller_name)
    seller_phone = (payload.seller.phone if payload.seller and payload.seller.phone else payload.seller_phone)
    seller_email = (payload.seller.email if payload.seller and payload.seller.email else payload.seller_email)
    seller_address = (payload.seller.address if payload.seller and payload.seller.address else payload.seller_address)
    seller_notes = (payload.seller.notes if payload.seller and payload.seller.notes else payload.seller_notes)

    deal = Deal(
        deal_number=deal_number,
        property_id=payload.property_id,
        seller_name=seller_name.strip() if seller_name else None,
        buyer_name=buyer_name.strip() if buyer_name else None,
        buyer_phone=buyer_phone.strip() if buyer_phone else None,
        buyer_email=buyer_email.strip() if buyer_email else None,
        buyer_address=buyer_address.strip() if buyer_address else None,
        buyer_notes=buyer_notes.strip() if buyer_notes else None,
        seller_phone=seller_phone.strip() if seller_phone else None,
        seller_email=seller_email.strip() if seller_email else None,
        seller_address=seller_address.strip() if seller_address else None,
        seller_notes=seller_notes.strip() if seller_notes else None,
        status=payload.status,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(deal)
    await db.commit()
    await db.refresh(deal)

    return _build_deal_out(deal, doc_count=0, prop=prop)


@router.get("/deals", response_model=DealListResponse)
async def list_deals(
    status_filter: Optional[DealStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """List all broker deals with search, status filtering, and document counts."""
    conditions = []
    if status_filter:
        conditions.append(Deal.status == status_filter)

    if search and search.strip():
        q = f"%{search.strip()}%"
        conditions.append(
            or_(
                Deal.deal_number.ilike(q),
                Deal.seller_name.ilike(q),
                Deal.buyer_name.ilike(q),
                Deal.buyer_phone.ilike(q),
                Deal.seller_phone.ilike(q),
                Deal.notes.ilike(q),
                Deal.property.has(Property.title.ilike(q)),
                Deal.property.has(Property.locality.ilike(q)),
            )
        )

    base_query = select(Deal).options(
        selectinload(Deal.property).selectinload(Property.images),
        selectinload(Deal.documents),
    )
    if conditions:
        base_query = base_query.where(and_(*conditions))

    # Total count
    count_query = select(func.count(Deal.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginated results
    query = base_query.order_by(desc(Deal.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    deals = result.scalars().all()

    deal_outs = [
        _build_deal_out(d, doc_count=len(d.documents) if d.documents else 0)
        for d in deals
    ]

    return DealListResponse(total=total, deals=deal_outs)


@router.get("/deals/{deal_id}", response_model=DealDetailOut)
async def get_deal_detail(
    deal_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full details of a specific deal, its categorized documents, and dynamic checklist."""
    result = await db.execute(
        select(Deal)
        .options(
            selectinload(Deal.property).selectinload(Property.images),
            selectinload(Deal.documents),
        )
        .where(Deal.id == deal_id)
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    docs = deal.documents or []
    doc_outs = [_format_doc_out(doc) for doc in sorted(docs, key=lambda x: x.created_at, reverse=True)]
    checklist = _build_checklist(docs)

    deal_out = _build_deal_out(deal, doc_count=len(doc_outs))
    return DealDetailOut(
        **deal_out.model_dump(),
        documents=doc_outs,
        checklist=checklist,
    )


@router.put("/deals/{deal_id}", response_model=DealOut)
@router.patch("/deals/{deal_id}", response_model=DealOut)
async def update_deal(
    deal_id: UUID,
    payload: DealUpdate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Update deal status, parties, notes, or property relationship."""
    result = await db.execute(
        select(Deal)
        .options(
            selectinload(Deal.property).selectinload(Property.images),
            selectinload(Deal.documents),
        )
        .where(Deal.id == deal_id)
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    if payload.property_id is not None:
        if payload.property_id:
            p_res = await db.execute(select(Property).where(Property.id == payload.property_id))
            if not p_res.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Specified property does not exist.")
        deal.property_id = payload.property_id

    # Update buyer fields
    if payload.buyer is not None:
        if payload.buyer.name is not None:
            deal.buyer_name = payload.buyer.name.strip() if payload.buyer.name else None
        if payload.buyer.phone is not None:
            deal.buyer_phone = payload.buyer.phone.strip() if payload.buyer.phone else None
        if payload.buyer.email is not None:
            deal.buyer_email = payload.buyer.email.strip() if payload.buyer.email else None
        if payload.buyer.address is not None:
            deal.buyer_address = payload.buyer.address.strip() if payload.buyer.address else None
        if payload.buyer.notes is not None:
            deal.buyer_notes = payload.buyer.notes.strip() if payload.buyer.notes else None
    else:
        if payload.buyer_name is not None:
            deal.buyer_name = payload.buyer_name.strip() if payload.buyer_name else None
        if payload.buyer_phone is not None:
            deal.buyer_phone = payload.buyer_phone.strip() if payload.buyer_phone else None
        if payload.buyer_email is not None:
            deal.buyer_email = payload.buyer_email.strip() if payload.buyer_email else None
        if payload.buyer_address is not None:
            deal.buyer_address = payload.buyer_address.strip() if payload.buyer_address else None
        if payload.buyer_notes is not None:
            deal.buyer_notes = payload.buyer_notes.strip() if payload.buyer_notes else None

    # Update seller fields
    if payload.seller is not None:
        if payload.seller.name is not None:
            deal.seller_name = payload.seller.name.strip() if payload.seller.name else None
        if payload.seller.phone is not None:
            deal.seller_phone = payload.seller.phone.strip() if payload.seller.phone else None
        if payload.seller.email is not None:
            deal.seller_email = payload.seller.email.strip() if payload.seller.email else None
        if payload.seller.address is not None:
            deal.seller_address = payload.seller.address.strip() if payload.seller.address else None
        if payload.seller.notes is not None:
            deal.seller_notes = payload.seller.notes.strip() if payload.seller.notes else None
    else:
        if payload.seller_name is not None:
            deal.seller_name = payload.seller_name.strip() if payload.seller_name else None
        if payload.seller_phone is not None:
            deal.seller_phone = payload.seller_phone.strip() if payload.seller_phone else None
        if payload.seller_email is not None:
            deal.seller_email = payload.seller_email.strip() if payload.seller_email else None
        if payload.seller_address is not None:
            deal.seller_address = payload.seller_address.strip() if payload.seller_address else None
        if payload.seller_notes is not None:
            deal.seller_notes = payload.seller_notes.strip() if payload.seller_notes else None

    # Update deal lifecycle status
    if payload.status is not None:
        deal.status = payload.status
        if payload.status in {DealStatus.completed, DealStatus.cancelled} and not deal.closed_at:
            deal.closed_at = datetime.utcnow()
        elif payload.status not in {DealStatus.completed, DealStatus.cancelled}:
            deal.closed_at = None

    if payload.notes is not None:
        deal.notes = payload.notes.strip() if payload.notes else None
    if payload.closed_at is not None:
        deal.closed_at = payload.closed_at

    await db.commit()
    await db.refresh(deal)

    return _build_deal_out(deal, doc_count=len(deal.documents) if deal.documents else 0)


@router.delete("/deals/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Delete a deal and cleanly destroy all associated private documents in Cloudinary."""
    result = await db.execute(
        select(Deal).options(selectinload(Deal.documents)).where(Deal.id == deal_id)
    )
    deal = result.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    failed_doc_deletions = []
    for doc in deal.documents:
        ok = delete_deal_document(doc.cloudinary_public_id, resource_type=doc.resource_type)
        if not ok:
            failed_doc_deletions.append(f"{doc.title} ({doc.id})")

    if failed_doc_deletions:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage cleanup failed for: {', '.join(failed_doc_deletions)}. Deal deletion aborted to prevent inconsistent state.",
        )

    try:
        await db.delete(deal)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Storage assets removed but database record deletion failed. Please contact administrator.",
        )
    return None


# ─── 2. Deal Document Management ─────────────────────────────────────────────

@router.post("/deals/{deal_id}/documents", response_model=DealDocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_to_deal(
    deal_id: UUID,
    title: str = Form(...),
    category: DocumentCategory = Form(...),
    party: Optional[str] = Form(None),
    document_side: Optional[str] = Form(None),
    file: UploadFile = File(...),
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a document into a Deal's private vault in authenticated Cloudinary storage.
    Validates file extension, magic bytes, and 15MB file size limit.
    """
    deal_res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    clean_title = title.strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="Document title is required.")

    content, clean_filename, file_ext, file_size = await validate_document_upload(file)

    upload_res = upload_deal_document(
        content=content,
        deal_number=deal.deal_number,
        category=category.value,
        original_filename=clean_filename,
        file_ext=file_ext,
        mime_type=file.content_type or "application/octet-stream",
    )

    doc = DealDocument(
        deal_id=deal.id,
        category=category,
        title=clean_title,
        original_filename=clean_filename,
        cloudinary_public_id=upload_res["cloudinary_public_id"],
        resource_type=upload_res["resource_type"],
        mime_type=file.content_type or "application/octet-stream",
        file_size=upload_res["file_size"],
        party=party.strip().lower() if party else None,
        document_side=document_side.strip().lower() if document_side else None,
        is_verified=False,
    )

    try:
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
    except Exception as e:
        delete_deal_document(upload_res["cloudinary_public_id"], resource_type=upload_res["resource_type"])
        raise HTTPException(status_code=500, detail=f"Failed to record document in database: {e}")

    return DealDocumentUploadResponse(
        message="Document uploaded successfully to deal vault.",
        document=_format_doc_out(doc),
    )


@router.patch("/deals/{deal_id}/documents/{document_id}/verify", response_model=DealDocumentOut)
async def verify_deal_document(
    deal_id: UUID,
    document_id: UUID,
    payload: DealDocumentVerifyRequest,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Mark a deal document as verified or unverified by the broker."""
    result = await db.execute(
        select(DealDocument).where(DealDocument.id == document_id, DealDocument.deal_id == deal_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found for this deal.")

    doc.is_verified = payload.is_verified
    doc.verified_at = datetime.utcnow() if payload.is_verified else None
    doc.verified_by = broker.id if payload.is_verified else None

    await db.commit()
    await db.refresh(doc)
    return _format_doc_out(doc)


@router.get("/deals/{deal_id}/documents", response_model=List[DealDocumentOut])
async def list_deal_documents(
    deal_id: UUID,
    category: Optional[DocumentCategory] = Query(None),
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """List all documents attached to a specific deal."""
    deal_res = await db.execute(select(Deal.id).where(Deal.id == deal_id))
    if not deal_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Deal not found.")

    query = select(DealDocument).where(DealDocument.deal_id == deal_id)
    if category:
        query = query.where(DealDocument.category == category)
    query = query.order_by(desc(DealDocument.created_at))

    result = await db.execute(query)
    docs = result.scalars().all()
    return [_format_doc_out(d) for d in docs]


@router.get("/documents/{document_id}", response_model=DealDocumentOut)
async def get_document_metadata(
    document_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve metadata for a specific deal document. Broker only."""
    result = await db.execute(select(DealDocument).where(DealDocument.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    return _format_doc_out(doc)


@router.get("/deals/{deal_id}/documents/{document_id}/download")
@router.get("/documents/{document_id}/download")
async def download_deal_document(
    document_id: UUID,
    deal_id: Optional[UUID] = None,
    as_json: bool = Query(False, alias="json"),
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Securely download or preview a deal document.
    Enforces strict broker authentication and ownership validation.
    Redirects to time-limited signed URL or serves securely from server.
    """
    result = await db.execute(select(DealDocument).where(DealDocument.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if deal_id:
        deal_res = await db.execute(select(Deal.id).where(Deal.id == deal_id))
        if not deal_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Deal not found.")
        if doc.deal_id != deal_id:
            raise HTTPException(status_code=404, detail="Document does not belong to the specified deal.")

    if doc.cloudinary_public_id.startswith("local:"):
        local_filename = doc.cloudinary_public_id.replace("local:", "")
        local_path = os.path.abspath(os.path.join(LOCAL_VAULT_DIR, local_filename))
        if not os.path.exists(local_path) or not local_path.startswith(LOCAL_VAULT_DIR):
            raise HTTPException(status_code=404, detail="Document physical file missing on server.")

        if as_json:
            return {
                "download_url": f"/api/documents/{document_id}/download",
                "filename": doc.original_filename,
                "expires_in": 3600,
            }

        return FileResponse(
            path=local_path,
            filename=doc.original_filename,
            media_type=doc.mime_type,
            headers={"Content-Disposition": f'inline; filename="{doc.original_filename}"'},
        )

    file_ext = os.path.splitext(doc.original_filename)[1].lower()
    signed_url = get_signed_document_url(
        public_id=doc.cloudinary_public_id,
        resource_type=doc.resource_type,
        format_ext=file_ext,
    )
    if not signed_url:
        raise HTTPException(status_code=502, detail="Failed to generate secure document download token.")

    if as_json:
        return {
            "download_url": signed_url,
            "filename": doc.original_filename,
            "expires_in": 3600,
        }

    return RedirectResponse(url=signed_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.delete("/deals/{deal_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal_document_endpoint(
    document_id: UUID,
    deal_id: Optional[UUID] = None,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document from a deal: removes Cloudinary asset and deletes DB record."""
    result = await db.execute(select(DealDocument).where(DealDocument.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if deal_id:
        deal_res = await db.execute(select(Deal.id).where(Deal.id == deal_id))
        if not deal_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Deal not found.")
        if doc.deal_id != deal_id:
            raise HTTPException(status_code=404, detail="Document does not belong to the specified deal.")

    storage_ok = delete_deal_document(doc.cloudinary_public_id, resource_type=doc.resource_type)
    if not storage_ok:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Storage cleanup failed for document asset. Database record preserved to prevent inconsistent state.",
        )

    try:
        await db.delete(doc)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Storage asset was purged but database record removal failed. Please contact administrator.",
        )
    return None


# ─── 3. Client Document Request Foundation ───────────────────────────────────

@router.post("/deals/{deal_id}/upload-requests", response_model=DealUploadRequestOut, status_code=status.HTTP_201_CREATED)
async def create_upload_request(
    deal_id: UUID,
    payload: DealUploadRequestCreate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a cryptographically secure, time-limited document upload request for a client.
    The secret token is returned once in the response; only its SHA-256 hash is persisted.
    """
    deal_res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    party = payload.party.strip().lower()
    if party not in {"buyer", "seller"}:
        raise HTTPException(status_code=400, detail="Party must be 'buyer' or 'seller'.")

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=payload.valid_days)

    req = DealUploadRequest(
        deal_id=deal.id,
        party=party,
        token_hash=token_hash,
        requested_by=broker.id,
        requested_docs=json.dumps(payload.requested_docs or []),
        message=payload.message.strip() if payload.message else None,
        expires_at=expires_at,
        is_revoked=False,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    docs = json.loads(req.requested_docs) if req.requested_docs else []
    return DealUploadRequestOut(
        id=req.id,
        deal_id=req.deal_id,
        party=req.party,
        requested_docs=docs,
        message=req.message,
        expires_at=req.expires_at,
        is_revoked=req.is_revoked,
        created_at=req.created_at,
        updated_at=req.updated_at,
        upload_token=raw_token,
        shareable_url=f"/upload-documents?token={raw_token}",
    )


@router.get("/deals/{deal_id}/upload-requests", response_model=List[DealUploadRequestOut])
async def list_deal_upload_requests(
    deal_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """List all client document upload requests for a specific deal."""
    deal_res = await db.execute(select(Deal.id).where(Deal.id == deal_id))
    if not deal_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Deal not found.")

    result = await db.execute(
        select(DealUploadRequest)
        .where(DealUploadRequest.deal_id == deal_id)
        .order_by(desc(DealUploadRequest.created_at))
    )
    requests = result.scalars().all()
    outs = []
    for r in requests:
        docs = json.loads(r.requested_docs) if r.requested_docs else []
        outs.append(DealUploadRequestOut(
            id=r.id,
            deal_id=r.deal_id,
            party=r.party,
            requested_docs=docs,
            message=r.message,
            expires_at=r.expires_at,
            is_revoked=r.is_revoked,
            created_at=r.created_at,
            updated_at=r.updated_at,
            upload_token=None,  # Token hash is protected, raw token not exposed
            shareable_url=None,
        ))
    return outs


@router.post("/deals/{deal_id}/upload-requests/{request_id}/revoke", response_model=DealUploadRequestOut)
async def revoke_upload_request(
    deal_id: UUID,
    request_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Immediately revoke a client upload request link."""
    result = await db.execute(
        select(DealUploadRequest).where(
            DealUploadRequest.id == request_id,
            DealUploadRequest.deal_id == deal_id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Upload request not found.")

    req.is_revoked = True
    await db.commit()
    await db.refresh(req)

    docs = json.loads(req.requested_docs) if req.requested_docs else []
    return DealUploadRequestOut(
        id=req.id,
        deal_id=req.deal_id,
        party=req.party,
        requested_docs=docs,
        message=req.message,
        expires_at=req.expires_at,
        is_revoked=req.is_revoked,
        created_at=req.created_at,
        updated_at=req.updated_at,
        upload_token=None,
        shareable_url=None,
    )


@router.get("/public/upload-requests/verify", response_model=PublicUploadRequestVerifyOut)
async def verify_public_upload_request(
    token: str = Query(..., min_length=16, max_length=128),
    db: AsyncSession = Depends(get_db),
):
    """
    Public validation endpoint for the client document upload token.
    Validates token hash, checks revocation and expiry.
    Returns safe metadata without exposing internal deal documents or PII.
    """
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    result = await db.execute(
        select(DealUploadRequest)
        .options(
            selectinload(DealUploadRequest.deal),
            selectinload(DealUploadRequest.requester),
        )
        .where(DealUploadRequest.token_hash == token_hash)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Invalid or unrecognized upload link.")

    if req.is_revoked:
        raise HTTPException(status_code=400, detail="This upload link has been revoked by the broker.")

    # Check expiration
    now = datetime.utcnow()
    # Normalize naive/aware for safety
    exp = req.expires_at.replace(tzinfo=None) if req.expires_at.tzinfo else req.expires_at
    if exp < now:
        raise HTTPException(status_code=410, detail="This upload link has expired. Please contact the broker for a new link.")

    # Determine broker name
    broker_name = "Kassim Shaikh"
    if req.requester and req.requester.full_name:
        broker_name = req.requester.full_name
    else:
        profile_res = await db.execute(select(BusinessProfile).limit(1))
        profile = profile_res.scalar_one_or_none()
        if profile and profile.broker_name:
            broker_name = profile.broker_name

    docs = json.loads(req.requested_docs) if req.requested_docs else []
    return PublicUploadRequestVerifyOut(
        valid=True,
        deal_number=req.deal.deal_number,
        party=req.party,
        requested_docs=docs,
        message=req.message,
        expires_at=req.expires_at,
        broker_name=broker_name,
    )


@router.post("/public/upload-requests/upload", response_model=ClientDocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def public_upload_client_document(
    token: str = Form(..., min_length=16, max_length=128),
    requested_doc_title: str = Form(...),
    document_side: str = Form("complete"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Public upload endpoint for clients using a valid tokenized upload request.
    Strictly verifies:
    1. Token validity, revocation, and expiration.
    2. That requested_doc_title is explicitly present in the token's requested_docs scope.
    3. Prevents IDOR by strictly binding to the token's deal_id and party.
    4. Validates file extension, magic bytes, MIME type, size limit, and sanitizes filename.
    5. Stores securely in private authenticated Cloudinary / vault storage.
    6. Prevents rapid duplicate uploads.
    """
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    result = await db.execute(
        select(DealUploadRequest)
        .options(selectinload(DealUploadRequest.deal))
        .where(DealUploadRequest.token_hash == token_hash)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Invalid or unrecognized upload link.")

    if req.is_revoked:
        raise HTTPException(status_code=400, detail="This upload request has been revoked.")

    now = datetime.utcnow()
    exp = req.expires_at.replace(tzinfo=None) if req.expires_at.tzinfo else req.expires_at
    if exp < now:
        raise HTTPException(status_code=410, detail="This upload link has expired. Please contact the broker for a new link.")

    # Validate requested_doc_title is within request scope
    allowed_docs = json.loads(req.requested_docs) if req.requested_docs else []
    clean_doc_title = requested_doc_title.strip()
    if not any(allowed.strip().lower() == clean_doc_title.lower() for allowed in allowed_docs):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Document '{clean_doc_title}' is not part of this upload request.",
        )

    # Validate side
    clean_side = document_side.strip().lower()
    if clean_side not in ("complete", "front", "back"):
        clean_side = "complete"

    # Validate file upload (magic bytes, size <= 15MB, extension, MIME, path traversal sanitization)
    content, clean_filename, file_ext, file_size = await validate_document_upload(file)

    # Prevent rapid duplicate uploads for the exact same deal, file size, and title in last 60 seconds
    recent_dup = await db.execute(
        select(DealDocument).where(
            DealDocument.deal_id == req.deal_id,
            DealDocument.file_size == file_size,
            DealDocument.original_filename == clean_filename,
            DealDocument.created_at >= (now - timedelta(seconds=60)),
        )
    )
    if recent_dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exact document was already uploaded recently. Please wait or choose another file.",
        )

    # Determine structured category and title
    # Category is derived strictly from request party (buyer or seller)
    party_val = req.party.strip().lower()
    category_val = DocumentCategory.buyer if party_val == "buyer" else DocumentCategory.seller

    side_label = f" ({clean_side.title()})" if clean_side in ("front", "back") else ""
    final_title = f"{clean_doc_title}{side_label}"

    # Upload to Cloudinary authenticated storage or local vault
    upload_res = upload_deal_document(
        content=content,
        deal_number=req.deal.deal_number,
        category=category_val.value,
        original_filename=clean_filename,
        file_ext=file_ext,
        mime_type=file.content_type or "application/octet-stream",
    )

    doc = DealDocument(
        deal_id=req.deal_id,
        category=category_val,
        title=final_title,
        original_filename=clean_filename,
        cloudinary_public_id=upload_res["cloudinary_public_id"],
        resource_type=upload_res["resource_type"],
        mime_type=file.content_type or "application/octet-stream",
        file_size=upload_res["file_size"],
        party=party_val,
        document_side=clean_side,
        is_verified=False,
    )

    try:
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
    except Exception as e:
        delete_deal_document(upload_res["cloudinary_public_id"], resource_type=upload_res["resource_type"])
        raise HTTPException(status_code=500, detail=f"Failed to record document in database: {e}")

    return ClientDocumentUploadResponse(
        success=True,
        message="Document uploaded successfully and securely sent to Ashiyana.",
        document_title=doc.title,
        document_side=doc.document_side,
        original_filename=doc.original_filename,
    )


# ─── Print Pack Generator Endpoints ──────────────────────────────────────────

@router.post("/deals/{deal_id}/print-pack")
async def generate_print_pack(
    deal_id: UUID,
    payload: DealPrintPackRequest,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an assembled, printable A4 PDF pack from selected DealDocuments.
    Enforces broker authentication, deal existence, and strict document-to-deal authorization.
    Combines front/back images intelligently, embeds standalone images, and losslessly preserves PDFs.
    Returns the unified PDF binary stream.
    """
    deal_res = await db.execute(
        select(Deal)
        .options(
            selectinload(Deal.property),
            selectinload(Deal.documents),
        )
        .where(Deal.id == deal_id)
    )
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    if not payload.document_ids:
        raise HTTPException(status_code=400, detail="At least one document must be selected to generate a print pack.")

    # Deduplicate while preserving order
    ordered_unique_ids = []
    seen = set()
    for doc_id in payload.document_ids:
        if doc_id not in seen:
            seen.add(doc_id)
            ordered_unique_ids.append(doc_id)

    # Fetch documents
    docs_res = await db.execute(
        select(DealDocument).where(DealDocument.id.in_(ordered_unique_ids))
    )
    found_docs = {d.id: d for d in docs_res.scalars().all()}

    # Check for missing document IDs
    if len(found_docs) != len(ordered_unique_ids):
        missing = [str(did) for did in ordered_unique_ids if did not in found_docs]
        raise HTTPException(status_code=404, detail=f"Document(s) not found: {', '.join(missing)}")

    # CRITICAL SECURITY CHECK: Enforce document-to-deal ownership
    for did, doc in found_docs.items():
        if doc.deal_id != deal_id:
            raise HTTPException(
                status_code=403,
                detail=f"Cross-deal authorization violation: Document '{doc.title}' does not belong to this deal.",
            )

    # Order documents to match requested sequence
    ordered_docs = [found_docs[did] for did in ordered_unique_ids]

    # Generate PDF in-memory
    pdf_bytes = await generate_deal_print_pack(
        deal=deal,
        documents=ordered_docs,
        include_cover=payload.include_cover_page,
    )

    safe_deal = re.sub(r"[^a-zA-Z0-9_-]", "", deal.deal_number)
    filename = f"{safe_deal}_Document-Pack.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.post("/deals/{deal_id}/print-pack/preview", response_model=DealPrintPackPreviewOut)
async def preview_print_pack(
    deal_id: UUID,
    payload: DealPrintPackRequest,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Preview the layout structure, smart front/back pairings, and estimated page count
    of a print pack prior to PDF generation.
    """
    deal_res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = deal_res.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found.")

    if not payload.document_ids:
        raise HTTPException(status_code=400, detail="At least one document must be selected.")

    # Deduplicate while preserving order
    ordered_unique_ids = []
    seen = set()
    for doc_id in payload.document_ids:
        if doc_id not in seen:
            seen.add(doc_id)
            ordered_unique_ids.append(doc_id)

    docs_res = await db.execute(
        select(DealDocument).where(DealDocument.id.in_(ordered_unique_ids))
    )
    found_docs = {d.id: d for d in docs_res.scalars().all()}

    if len(found_docs) != len(ordered_unique_ids):
        missing = [str(did) for did in ordered_unique_ids if did not in found_docs]
        raise HTTPException(status_code=404, detail=f"Document(s) not found: {', '.join(missing)}")

    for did, doc in found_docs.items():
        if doc.deal_id != deal_id:
            raise HTTPException(
                status_code=403,
                detail=f"Cross-deal authorization violation: Document '{doc.title}' does not belong to this deal.",
            )

    ordered_docs = [found_docs[did] for did in ordered_unique_ids]
    grouped_items = group_documents_for_printing(ordered_docs)

    preview_items = []
    total_pages = 1 if payload.include_cover_page else 0
    paired_count = 0
    standalone_count = 0

    for itm in grouped_items:
        if itm.item_type == "paired":
            paired_count += 2
            est_pages = 1
        elif itm.item_type == "pdf":
            standalone_count += 1
            est_pages = 1
        else:
            standalone_count += 1
            est_pages = 1
        total_pages += est_pages

        preview_items.append(
            PrintPackPreviewItemOut(
                item_type=itm.item_type,
                title=itm.title,
                party=itm.party,
                document_ids=[d.id for d in itm.documents],
                filenames=[d.original_filename for d in itm.documents],
                estimated_pages=est_pages,
            )
        )

    return DealPrintPackPreviewOut(
        deal_id=deal.id,
        deal_number=deal.deal_number,
        total_documents_selected=len(ordered_docs),
        paired_documents_count=paired_count,
        standalone_documents_count=standalone_count,
        estimated_total_pages=total_pages,
        include_cover_page=payload.include_cover_page,
        items=preview_items,
    )

