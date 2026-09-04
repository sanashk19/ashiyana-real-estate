from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
from datetime import datetime, timezone, date
from typing import List, Optional
import os

from app.db.database import get_db
from app.core.dependencies import require_broker, require_registered_user
from app.models.models import (
    User, UserRole, Property, Enquiry, SellerSubmission,
    PropertyDocument, PropertyStatus, LeadStatus, SubmissionStatus,
    SavedProperty,
)
from app.schemas.broker import (
    DocumentUpload, DocumentAccessGrant, DocumentOut,
    ValuationRequest, ValuationOut, DashboardStats,
    BrokerSellerListItemOut, BrokerSellerDetailOut,
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

    # Enquiry counts (non-archived only)
    enquiry_stats = await db.execute(
        select(Enquiry.status, func.count(Enquiry.id))
        .where(Enquiry.is_archived == False)
        .group_by(Enquiry.status)
    )
    enquiry_map = {row[0]: row[1] for row in enquiry_stats.all()}

    # Enquiries created today (non-archived only)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    enquiries_today = await db.execute(
        select(func.count(Enquiry.id)).where(
            Enquiry.created_at >= today_start,
            Enquiry.is_archived == False
        )
    )

    # Follow-ups due today or overdue (non-archived only)
    follow_ups_due = await db.execute(
        select(func.count(Enquiry.id)).where(
            and_(
                Enquiry.follow_up_date <= datetime.now(timezone.utc),
                Enquiry.status.notin_([LeadStatus.closed, LeadStatus.lost]),
                Enquiry.is_archived == False
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
        )
        db.add(valuation)
        await db.commit()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to persist valuation history: {e}")

    return ValuationOut(**result)


@router.get("/valuation-history", response_model=list)
async def valuation_history(
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Broker's history of all past price estimates."""
    from app.models.models import Valuation
    from app.services.estimator import LOCALITY_BASE_PRICE
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
            "estimated_low": float(v.estimated_low) if v.estimated_low else 0.0,
            "estimated_mid": float(v.estimated_mid) if v.estimated_mid else 0.0,
            "estimated_high": float(v.estimated_high) if v.estimated_high else 0.0,
            "confidence_score": 0.82 if v.locality.lower().strip() in LOCALITY_BASE_PRICE else 0.60,
            "created_at": v.created_at.isoformat() if v.created_at else "",
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


# ── Sellers Management ────────────────────────────────────────────────────────

@router.get("/sellers", response_model=List[BrokerSellerListItemOut])
async def get_sellers(
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all registered property sellers from PostgreSQL with metrics.
    """
    sellers_res = await db.execute(
        select(User).where(User.role.in_([UserRole.seller, UserRole.user])).order_by(User.created_at.desc())
    )
    sellers = sellers_res.scalars().all()

    output = []
    for s in sellers:
        # Submissions count
        subs_cnt = (await db.execute(
            select(func.count(SellerSubmission.id)).where(SellerSubmission.user_id == s.id)
        )).scalar() or 0

        # Listed properties count
        listed_cnt = (await db.execute(
            select(func.count(SellerSubmission.id)).where(
                SellerSubmission.user_id == s.id,
                SellerSubmission.status == SubmissionStatus.listed
            )
        )).scalar() or 0

        # Documents count (retired)
        docs_cnt = 0

        output.append(
            BrokerSellerListItemOut(
                id=s.id,
                full_name=s.full_name,
                email=s.email,
                phone=s.phone,
                role=s.role.value if hasattr(s.role, "value") else str(s.role),
                is_active=s.is_active,
                created_at=s.created_at,
                submissions_count=subs_cnt,
                listed_properties_count=listed_cnt,
                documents_count=docs_cnt,
            )
        )
    return output


@router.get("/sellers/{seller_id}", response_model=BrokerSellerDetailOut)
async def get_seller_detail(
    seller_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns detailed seller profile including submissions, listed properties, and uploaded documents.
    """
    seller_res = await db.execute(select(User).where(User.id == seller_id))
    seller = seller_res.scalar_one_or_none()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    # Fetch submissions
    subs_res = await db.execute(
        select(SellerSubmission).where(SellerSubmission.user_id == seller_id).order_by(SellerSubmission.created_at.desc())
    )
    submissions = subs_res.scalars().all()
    subs_data = [
        {
            "id": str(sub.id),
            "property_type": sub.property_type.value if hasattr(sub.property_type, "value") else str(sub.property_type),
            "listing_type": sub.listing_type.value if hasattr(sub.listing_type, "value") else str(sub.listing_type),
            "locality": sub.locality,
            "area_sqft": sub.area_sqft,
            "bedrooms": sub.bedrooms,
            "asking_price": float(sub.asking_price) if sub.asking_price is not None else None,
            "description": sub.description,
            "submitted_photos": sub.submitted_photos or [],
            "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "converted_property_id": str(sub.converted_property_id) if sub.converted_property_id else None,
        }
        for sub in submissions
    ]

    # Fetch listed properties
    prop_ids = [sub.converted_property_id for sub in submissions if sub.converted_property_id]
    listed_props_data = []
    if prop_ids:
        props_res = await db.execute(select(Property).where(Property.id.in_(prop_ids)))
        for p in props_res.scalars().all():
            listed_props_data.append({
                "id": str(p.id),
                "title": p.title,
                "locality": p.locality,
                "price": float(p.price) if p.price is not None else 0.0,
                "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            })

    # Documents (retired)
    docs_data = []

    return BrokerSellerDetailOut(
        id=seller.id,
        full_name=seller.full_name,
        email=seller.email,
        phone=seller.phone,
        role=seller.role.value if hasattr(seller.role, "value") else str(seller.role),
        is_active=seller.is_active,
        created_at=seller.created_at,
        submissions=subs_data,
        listed_properties=listed_props_data,
        documents=docs_data,
    )


@router.get("/properties/watcher-summary", response_model=List[dict])
async def get_properties_watcher_summary(
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker-only: Bulk aggregation of watcher counts for all properties.
    Prevents N+1 requests in the broker property management portal.
    """
    result = await db.execute(
        select(SavedProperty.property_id, func.count(SavedProperty.id))
        .group_by(SavedProperty.property_id)
    )
    rows = result.all()
    return [
        {"property_id": str(row[0]), "watcher_count": int(row[1])}
        for row in rows
    ]
