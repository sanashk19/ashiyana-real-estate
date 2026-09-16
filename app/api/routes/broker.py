from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
from datetime import datetime, timezone, date
from typing import List, Optional
import os

from app.db.database import get_db
from app.core.dependencies import require_broker
from app.models.models import (
    User, UserRole, Property, Enquiry, SellerSubmission,
    PropertyStatus, LeadStatus, SubmissionStatus,
    SavedProperty,
)
from app.schemas.broker import (
    DashboardStats,
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
