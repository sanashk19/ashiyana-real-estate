from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case
from sqlalchemy.orm import selectinload
from typing import List

from app.db.database import get_db
from app.core.dependencies import require_seller
from app.models.models import (
    User, SellerSubmission, Property,
    SubmissionStatus, PropertyImage,
)
from app.schemas.seller import (
    SellerSubmissionCardOut, SellerListedPropertyOut,
    SellerDashboardStats,
)

router = APIRouter(prefix="/seller", tags=["seller dashboard"])


# ── 1. Seller Dashboard Overview ──────────────────────────────────────────────

@router.get("/dashboard", response_model=SellerDashboardStats)
async def get_seller_dashboard(
    current_user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns summary metrics for the authenticated seller's dashboard in a single aggregated query.
    """
    stats_query = select(
        func.count(SellerSubmission.id).label("total"),
        func.count(
            case(
                (SellerSubmission.status.in_([SubmissionStatus.pending, SubmissionStatus.reviewing]), SellerSubmission.id),
                else_=None
            )
        ).label("pending"),
        func.count(
            case(
                (SellerSubmission.status == SubmissionStatus.listed, SellerSubmission.id),
                else_=None
            )
        ).label("listed"),
    ).where(SellerSubmission.user_id == current_user.id)

    res = await db.execute(stats_query)
    row = res.one()

    return SellerDashboardStats(
        total_submissions=row.total or 0,
        pending_submissions=row.pending or 0,
        listed_properties=row.listed or 0,
        total_documents=0,
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
    Uses selectinload to eagerly fetch thumbnail images in a single batch without N+1 per-row queries.
    """
    props_res = await db.execute(
        select(Property)
        .options(selectinload(Property.images))
        .join(SellerSubmission, SellerSubmission.converted_property_id == Property.id)
        .where(SellerSubmission.user_id == current_user.id)
        .order_by(desc(Property.created_at))
    )
    properties = props_res.scalars().all()

    output = []
    for p in properties:
        first_img = p.images[0].image_url if p.images else None

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
