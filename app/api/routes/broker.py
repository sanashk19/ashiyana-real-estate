from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
from datetime import datetime, timezone, date
from typing import List

from app.db.database import get_db
from app.core.dependencies import require_broker, require_registered_user
from app.models.models import (
    User, Property, Enquiry, SellerSubmission,
    PropertyDocument, PropertyStatus, LeadStatus, SubmissionStatus,
)
from app.schemas.broker import (
    DocumentUpload, DocumentAccessGrant, DocumentOut,
    ValuationRequest, ValuationOut, DashboardStats,
)

router = APIRouter(prefix="/broker", tags=["broker dashboard"])


# ── Dashboard summary ─────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Single endpoint that powers the broker home screen.
    All the numbers he needs at a glance.
    """
    # Listing counts by status
    listing_stats = await db.execute(
        select(Property.status, func.count(Property.id)).group_by(Property.status)
    )
    listing_map = {row[0]: row[1] for row in listing_stats.all()}

    featured_count = await db.execute(
        select(func.count(Property.id)).where(
            Property.is_featured == True,
            Property.status == PropertyStatus.active
        )
    )

    # Enquiry counts
    enquiry_stats = await db.execute(
        select(Enquiry.status, func.count(Enquiry.id)).group_by(Enquiry.status)
    )
    enquiry_map = {row[0]: row[1] for row in enquiry_stats.all()}

    # Enquiries created today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    enquiries_today = await db.execute(
        select(func.count(Enquiry.id)).where(Enquiry.created_at >= today_start)
    )

    # Follow-ups due today or overdue
    follow_ups_due = await db.execute(
        select(func.count(Enquiry.id)).where(
            and_(
                Enquiry.follow_up_date <= datetime.now(timezone.utc),
                Enquiry.status.notin_([LeadStatus.closed, LeadStatus.lost])
            )
        )
    )

    # Pending seller submissions
    pending_subs = await db.execute(
        select(func.count(SellerSubmission.id)).where(
            SellerSubmission.status == SubmissionStatus.pending
        )
    )

    # Most viewed property
    most_viewed = await db.execute(
        select(Property.id, Property.title, Property.view_count)
        .where(Property.status == PropertyStatus.active)
        .order_by(Property.view_count.desc())
        .limit(1)
    )
    mv = most_viewed.first()

    return DashboardStats(
        total_active_listings=listing_map.get(PropertyStatus.active, 0),
        total_sold=listing_map.get(PropertyStatus.sold, 0),
        total_rented=listing_map.get(PropertyStatus.rented, 0),
        featured_count=featured_count.scalar_one(),
        new_enquiries=enquiry_map.get(LeadStatus.new, 0),
        enquiries_today=enquiries_today.scalar_one(),
        follow_ups_due=follow_ups_due.scalar_one(),
        pending_submissions=pending_subs.scalar_one(),
        most_viewed_property_id=str(mv[0]) if mv else None,
        most_viewed_property_title=mv[1] if mv else None,
        most_viewed_count=mv[2] if mv else 0,
    )


@router.get("/follow-ups", response_model=list)
async def get_follow_ups(
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """All leads with follow-up dates due today or earlier."""
    result = await db.execute(
        select(Enquiry).where(
            and_(
                Enquiry.follow_up_date <= datetime.now(timezone.utc),
                Enquiry.status.notin_([LeadStatus.closed, LeadStatus.lost])
            )
        ).order_by(Enquiry.follow_up_date.asc())
    )
    leads = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "buyer_name": e.buyer_name,
            "buyer_phone": e.buyer_phone,
            "property_id": str(e.property_id),
            "status": e.status.value,
            "follow_up_date": e.follow_up_date.isoformat() if e.follow_up_date else None,
            "broker_notes": e.broker_notes,
        }
        for e in leads
    ]


# ── Private AI price estimator ────────────────────────────────────────────────

@router.post("/estimate-price", response_model=ValuationOut)
async def estimate_price(
    data: ValuationRequest,
    broker: User = Depends(require_broker),   # HARD GATE — broker only
    db: AsyncSession = Depends(get_db),
):
    """
    Private AI price estimator.
    BROKER EYES ONLY — never called from frontend public pages.
    Helps broker advise sellers on realistic pricing.
    Result optionally saved to valuations table for reference.
    """
    from app.services.estimator import estimate_price as _estimate
    from app.models.models import Valuation, GoaRegion, PropertyType

    result = _estimate(
        locality=data.locality,
        area_sqft=data.area_sqft,
        property_type=data.property_type,
        bedrooms=data.bedrooms,
        age_years=data.age_years,
        beach_distance_km=data.beach_distance_km,
        mopa_airport_km=data.mopa_airport_km,
        floor_number=data.floor_number,
        region=data.region,
        furnished=data.furnished,
    )

    # Save to valuations table for broker's reference history
    try:
        region_enum = GoaRegion(data.region)
        prop_type_enum = PropertyType(data.property_type)

        valuation = Valuation(
            property_id=data.property_id,
            submission_id=data.submission_id,
            locality=data.locality,
            area_sqft=data.area_sqft,
            property_type=prop_type_enum,
            bedrooms=data.bedrooms,
            age_years=data.age_years,
            beach_distance_km=data.beach_distance_km,
            region=region_enum,
            estimated_low=result["estimated_low"],
            estimated_mid=result["estimated_mid"],
            estimated_high=result["estimated_high"],
            confidence_score=result["confidence_score"],
        )
        db.add(valuation)
        await db.flush()
    except Exception:
        pass  # Don't fail the estimate if saving fails

    return ValuationOut(**result)


@router.get("/valuation-history", response_model=list)
async def valuation_history(
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Broker's history of all past price estimates."""
    from app.models.models import Valuation
    result = await db.execute(
        select(Valuation).order_by(Valuation.created_at.desc()).limit(50)
    )
    valuations = result.scalars().all()
    return [
        {
            "id": str(v.id),
            "locality": v.locality,
            "area_sqft": v.area_sqft,
            "property_type": v.property_type.value,
            "estimated_low": v.estimated_low,
            "estimated_mid": v.estimated_mid,
            "estimated_high": v.estimated_high,
            "confidence_score": v.confidence_score,
            "created_at": v.created_at.isoformat(),
        }
        for v in valuations
    ]


# ── Document vault ────────────────────────────────────────────────────────────

@router.post("/documents", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_document(
    data: DocumentUpload,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker adds a document to a property's vault.
    is_public=False (default) means only broker-approved buyers can see it.
    """
    # Verify property exists
    prop = await db.execute(select(Property).where(Property.id == data.property_id))
    if not prop.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Property not found")

    doc = PropertyDocument(
        property_id=data.property_id,
        name=data.name,
        doc_type=data.doc_type,
        file_url=data.file_url,
        is_public=data.is_public,
        allowed_user_ids=[],
    )
    db.add(doc)
    await db.flush()

    return {"id": str(doc.id), "message": "Document added to vault"}


@router.get("/documents/{property_id}", response_model=List[DocumentOut])
async def get_property_documents(
    property_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Broker sees ALL documents for a property."""
    result = await db.execute(
        select(PropertyDocument)
        .where(PropertyDocument.property_id == property_id)
        .order_by(PropertyDocument.uploaded_at.desc())
    )
    return [DocumentOut.model_validate(d) for d in result.scalars().all()]


@router.post("/documents/{document_id}/grant-access", response_model=dict)
async def grant_document_access(
    document_id: UUID,
    data: DocumentAccessGrant,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker grants specific buyers access to a document.
    This is how address/deed info is selectively shared
    only with serious, qualified buyers.
    """
    result = await db.execute(
        select(PropertyDocument).where(PropertyDocument.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    existing = doc.allowed_user_ids or []
    new_ids = [str(uid) for uid in data.user_ids]
    doc.allowed_user_ids = list(set(existing + new_ids))

    return {"message": f"Access granted to {len(new_ids)} user(s)"}


@router.delete("/documents/{document_id}/revoke-access", response_model=dict)
async def revoke_document_access(
    document_id: UUID,
    data: DocumentAccessGrant,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Broker revokes document access from specific buyers."""
    result = await db.execute(
        select(PropertyDocument).where(PropertyDocument.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    revoke_ids = [str(uid) for uid in data.user_ids]
    doc.allowed_user_ids = [uid for uid in (doc.allowed_user_ids or []) if uid not in revoke_ids]

    return {"message": f"Access revoked from {len(revoke_ids)} user(s)"}


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PropertyDocument).where(PropertyDocument.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)


# ── Buyer: view documents they have access to ─────────────────────────────────

@router.get("/my-documents/{property_id}", response_model=list)
async def buyer_documents(
    property_id: UUID,
    current_user: User = Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Registered buyer sees only documents broker has unlocked for them.
    Public docs + docs where their user_id is in allowed_user_ids.
    """
    result = await db.execute(
        select(PropertyDocument).where(
            PropertyDocument.property_id == property_id
        )
    )
    all_docs = result.scalars().all()
    user_id_str = str(current_user.id)

    accessible = [
        d for d in all_docs
        if d.is_public or user_id_str in (d.allowed_user_ids or [])
    ]

    return [
        {
            "id": str(d.id),
            "name": d.name,
            "doc_type": d.doc_type,
            "file_url": d.file_url,
            "uploaded_at": d.uploaded_at.isoformat(),
        }
        for d in accessible
    ]
