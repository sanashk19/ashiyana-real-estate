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
    User, UserRole, SellerSubmission, Property,
    SubmissionStatus, PropertyStatus, PropertyImage,
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

    return SellerDashboardStats(
        total_submissions=total_submissions,
        pending_submissions=pending_submissions,
        listed_properties=listed_properties,
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
