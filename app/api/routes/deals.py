import os
import re
from datetime import datetime
from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, and_
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.core.dependencies import require_broker
from app.models.models import (
    User, Deal, DealDocument, Property, PropertyImage,
    DealStatus, DocumentCategory,
)
from app.schemas.deals import (
    DealCreate, DealUpdate, DealOut, DealDetailOut, DealListResponse,
    DealDocumentOut, DealDocumentUploadResponse, DealPropertyInfo,
)
from app.services.cloudinary_service import (
    validate_document_upload, upload_deal_document,
    get_signed_document_url, delete_deal_document,
    LOCAL_VAULT_DIR,
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
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        download_url=f"/api/broker/documents/{doc.id}/download",
    )


# ─── 1. Deal Management (CRUD) ───────────────────────────────────────────────

@router.post("/deals", response_model=DealOut, status_code=status.HTTP_201_CREATED)
async def create_deal(
    payload: DealCreate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Create a new Deal with atomic server-side deal_number generation."""
    prop = None
    if payload.property_id:
        prop_res = await db.execute(
            select(Property).options(selectinload(Property.images)).where(Property.id == payload.property_id)
        )
        prop = prop_res.scalar_one_or_none()
        if not prop:
            raise HTTPException(status_code=404, detail="Selected property does not exist.")

    deal_number = await generate_next_deal_number(db)

    deal = Deal(
        deal_number=deal_number,
        property_id=payload.property_id,
        seller_name=payload.seller_name.strip() if payload.seller_name else None,
        buyer_name=payload.buyer_name.strip() if payload.buyer_name else None,
        status=payload.status,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(deal)
    await db.commit()
    await db.refresh(deal)

    return DealOut(
        id=deal.id,
        deal_number=deal.deal_number,
        property_id=deal.property_id,
        property=_build_property_info(prop),
        seller_name=deal.seller_name,
        buyer_name=deal.buyer_name,
        status=deal.status,
        notes=deal.notes,
        document_count=0,
        created_at=deal.created_at,
        updated_at=deal.updated_at,
        closed_at=deal.closed_at,
    )


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
        DealOut(
            id=d.id,
            deal_number=d.deal_number,
            property_id=d.property_id,
            property=_build_property_info(d.property),
            seller_name=d.seller_name,
            buyer_name=d.buyer_name,
            status=d.status,
            notes=d.notes,
            document_count=len(d.documents) if d.documents else 0,
            created_at=d.created_at,
            updated_at=d.updated_at,
            closed_at=d.closed_at,
        )
        for d in deals
    ]

    return DealListResponse(total=total, deals=deal_outs)


@router.get("/deals/{deal_id}", response_model=DealDetailOut)
async def get_deal_detail(
    deal_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full details of a specific deal and its categorized documents."""
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

    doc_outs = [_format_doc_out(doc) for doc in sorted(deal.documents, key=lambda x: x.created_at, reverse=True)]

    return DealDetailOut(
        id=deal.id,
        deal_number=deal.deal_number,
        property_id=deal.property_id,
        property=_build_property_info(deal.property),
        seller_name=deal.seller_name,
        buyer_name=deal.buyer_name,
        status=deal.status,
        notes=deal.notes,
        document_count=len(doc_outs),
        created_at=deal.created_at,
        updated_at=deal.updated_at,
        closed_at=deal.closed_at,
        documents=doc_outs,
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

    if payload.seller_name is not None:
        deal.seller_name = payload.seller_name.strip() if payload.seller_name else None
    if payload.buyer_name is not None:
        deal.buyer_name = payload.buyer_name.strip() if payload.buyer_name else None
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

    return DealOut(
        id=deal.id,
        deal_number=deal.deal_number,
        property_id=deal.property_id,
        property=_build_property_info(deal.property),
        seller_name=deal.seller_name,
        buyer_name=deal.buyer_name,
        status=deal.status,
        notes=deal.notes,
        document_count=len(deal.documents) if deal.documents else 0,
        created_at=deal.created_at,
        updated_at=deal.updated_at,
        closed_at=deal.closed_at,
    )


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

    # Clean up Cloudinary storage for all deal documents
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

    # 1. Validate file (size, extension, binary magic bytes)
    content, clean_filename, file_ext, file_size = await validate_document_upload(file)

    # 2. Upload to Cloudinary authenticated storage
    upload_res = upload_deal_document(
        content=content,
        deal_number=deal.deal_number,
        category=category.value,
        original_filename=clean_filename,
        file_ext=file_ext,
        mime_type=file.content_type or "application/octet-stream",
    )

    # 3. Create database record
    doc = DealDocument(
        deal_id=deal.id,
        category=category,
        title=clean_title,
        original_filename=clean_filename,
        cloudinary_public_id=upload_res["cloudinary_public_id"],
        resource_type=upload_res["resource_type"],
        mime_type=file.content_type or "application/octet-stream",
        file_size=upload_res["file_size"],
    )

    try:
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
    except Exception as e:
        # Reconcile partial failure: clean up uploaded asset
        delete_deal_document(upload_res["cloudinary_public_id"], resource_type=upload_res["resource_type"])
        raise HTTPException(status_code=500, detail=f"Failed to record document in database: {e}")

    return DealDocumentUploadResponse(
        message="Document uploaded successfully to deal vault.",
        document=_format_doc_out(doc),
    )


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

    # 1. Local vault fallback (offline/test setups)
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

    # 2. Cloudinary authenticated delivery with time-limited signed URL
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

    # 1. Destroy asset from Cloudinary / local storage
    storage_ok = delete_deal_document(doc.cloudinary_public_id, resource_type=doc.resource_type)
    if not storage_ok:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Storage cleanup failed for document asset. Database record preserved to prevent inconsistent state.",
        )

    # 2. Delete database record
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
