import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from uuid import UUID
from typing import List, Optional

from app.db.database import get_db
from app.core.dependencies import require_seller, require_registered_user, get_current_user
from app.models.models import (
    User, UserRole, SellerSubmission, SellerDocument, Property,
    SubmissionStatus, PropertyStatus, PropertyImage,
)
from app.schemas.seller import (
    SellerDocumentOut, SellerSubmissionCardOut, SellerListedPropertyOut,
    SellerDashboardStats, SellerDocumentUploadResponse,
)

router = APIRouter(prefix="/seller", tags=["seller dashboard & documents"])

SECURE_DOCS_DIR = os.path.join("secure_vault", "documents")
os.makedirs(SECURE_DOCS_DIR, exist_ok=True)


# ── 1. Seller Dashboard Overview ──────────────────────────────────────────────

@router.get("/dashboard", response_model=SellerDashboardStats)
async def get_seller_dashboard(
    current_user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns summary metrics for the authenticated seller's dashboard.
    """
    # Total submissions
    subs_total_res = await db.execute(
        select(func.count(SellerSubmission.id)).where(SellerSubmission.user_id == current_user.id)
    )
    total_submissions = subs_total_res.scalar() or 0

    # Pending submissions
    pending_res = await db.execute(
        select(func.count(SellerSubmission.id)).where(
            SellerSubmission.user_id == current_user.id,
            SellerSubmission.status.in_([SubmissionStatus.pending, SubmissionStatus.reviewing])
        )
    )
    pending_submissions = pending_res.scalar() or 0

    # Listed properties
    listed_res = await db.execute(
        select(func.count(SellerSubmission.id)).where(
            SellerSubmission.user_id == current_user.id,
            SellerSubmission.status == SubmissionStatus.listed
        )
    )
    listed_properties = listed_res.scalar() or 0

    # Total documents uploaded
    docs_res = await db.execute(
        select(func.count(SellerDocument.id)).where(SellerDocument.user_id == current_user.id)
    )
    total_documents = docs_res.scalar() or 0

    return SellerDashboardStats(
        total_submissions=total_submissions,
        pending_submissions=pending_submissions,
        listed_properties=listed_properties,
        total_documents=total_documents,
        seller_name=current_user.full_name,
        seller_email=current_user.email,
    )


# ── 2. My Property Submissions ────────────────────────────────────────────────

@router.get("/submissions", response_model=List[SellerSubmissionCardOut])
async def get_my_submissions(
    current_user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all property submissions submitted by this registered seller.
    """
    result = await db.execute(
        select(SellerSubmission)
        .where(SellerSubmission.user_id == current_user.id)
        .order_by(desc(SellerSubmission.created_at))
    )
    return result.scalars().all()


# ── 3. My Listed Properties ───────────────────────────────────────────────────

@router.get("/properties", response_model=List[SellerListedPropertyOut])
async def get_my_listed_properties(
    current_user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns public properties that were converted and listed from this seller's submissions.
    """
    result = await db.execute(
        select(SellerSubmission.converted_property_id)
        .where(
            SellerSubmission.user_id == current_user.id,
            SellerSubmission.converted_property_id.isnot(None)
        )
    )
    property_ids = [row[0] for row in result.all() if row[0] is not None]

    if not property_ids:
        return []

    props_res = await db.execute(
        select(Property).where(Property.id.in_(property_ids)).order_by(desc(Property.created_at))
    )
    properties = props_res.scalars().all()

    output = []
    for p in properties:
        # Fetch first image
        img_res = await db.execute(
            select(PropertyImage.image_url)
            .where(PropertyImage.property_id == p.id)
            .order_by(PropertyImage.display_order.asc())
            .limit(1)
        )
        first_img = img_res.scalar_one_or_none()

        output.append(
            SellerListedPropertyOut(
                id=p.id,
                title=p.title,
                property_type=p.property_type,
                listing_type=p.listing_type,
                locality=p.locality,
                price=float(p.price) if p.price is not None else 0.0,
                status=p.status,
                thumbnail_url=first_img,
                view_count=p.view_count or 0,
                created_at=p.created_at,
            )
        )

    return output


# ── 4. Document Vault — Upload, List, Download, Delete ────────────────────────

@router.post("/documents/upload", response_model=SellerDocumentUploadResponse)
async def upload_seller_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    doc_type: str = Form("other"),
    submission_id: Optional[UUID] = Form(None),
    current_user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """
    Secure Document Upload for registered sellers.
    Stored securely in private server directory with server-side access control.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    # Validate file size (max 25MB)
    MAX_SIZE = 25 * 1024 * 1024
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 25MB limit.")

    # Generate secure internal filename
    file_ext = os.path.splitext(file.filename)[1].lower()
    doc_id = uuid.uuid4()
    safe_filename = f"{doc_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    dest_path = os.path.join(SECURE_DOCS_DIR, safe_filename)

    with open(dest_path, "wb") as out_file:
        out_file.write(content)

    doc = SellerDocument(
        id=doc_id,
        user_id=current_user.id,
        submission_id=submission_id,
        title=title.strip() or file.filename,
        doc_type=doc_type.strip() or "other",
        file_path=dest_path,
        original_filename=file.filename,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return SellerDocumentUploadResponse(
        message="Document uploaded securely to your private vault.",
        document=SellerDocumentOut.model_validate(doc),
    )


@router.get("/documents", response_model=List[SellerDocumentOut])
async def list_seller_documents(
    current_user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns only the authenticated seller's private documents.
    """
    result = await db.execute(
        select(SellerDocument)
        .where(SellerDocument.user_id == current_user.id)
        .order_by(desc(SellerDocument.created_at))
    )
    return result.scalars().all()


@router.get("/documents/{doc_id}/download")
async def download_seller_document(
    doc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Secure Document Download with strict server-side ownership verification.
    Allowed only for:
    1. The seller who owns the document (doc.user_id == current_user.id)
    2. The authorized broker (current_user.role == 'broker')
    All other requests are blocked with 403 Forbidden.
    """
    result = await db.execute(select(SellerDocument).where(SellerDocument.id == doc_id))
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Authorization Check
    is_owner = str(doc.user_id) == str(current_user.id)
    is_broker = current_user.role == UserRole.broker or str(current_user.role) == "broker"

    if not is_owner and not is_broker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not have permission to view or download this document."
        )

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Physical document file missing on server.")

    return FileResponse(
        path=doc.file_path,
        filename=doc.original_filename,
        media_type=doc.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{doc.original_filename}"'}
    )


@router.delete("/documents/{doc_id}")
async def delete_seller_document(
    doc_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a private document. Only the owning seller or broker can delete.
    """
    result = await db.execute(select(SellerDocument).where(SellerDocument.id == doc_id))
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    is_owner = str(doc.user_id) == str(current_user.id)
    is_broker = current_user.role == UserRole.broker or str(current_user.role) == "broker"

    if not is_owner and not is_broker:
        raise HTTPException(status_code=403, detail="Access denied. You can only delete your own documents.")

    # Delete physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"Error removing file {doc.file_path}: {e}")

    await db.delete(doc)
    await db.commit()

    return {"message": "Document deleted successfully."}
