from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from typing import Optional

from app.db.database import get_db
from app.core.dependencies import get_optional_user, require_broker, require_registered_user
from app.models.models import (
    User, Enquiry, SellerSubmission, Property,
    LeadStatus, SubmissionStatus, UserRole
)
from app.schemas.enquiries import (
    EnquiryCreate, EnquiryBrokerUpdate, EnquiryOut,
    SellerSubmissionCreate, SellerSubmissionBrokerUpdate, SellerSubmissionOut,
)

router = APIRouter(tags=["enquiries & submissions"])


# ── Enquiries ──────────────────────────────────────────────────────────────────

@router.post("/enquiries", response_model=dict, status_code=status.HTTP_201_CREATED)
async def submit_enquiry(
    data: EnquiryCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Any visitor can enquire. Inquiry goes to broker dashboard ONLY.
    Buyer never gets seller/owner contact info.
    """
    # Verify property exists and is active
    prop_result = await db.execute(
        select(Property).where(Property.id == data.property_id)
    )
    prop = prop_result.scalar_one_or_none()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    enquiry = Enquiry(
        property_id=data.property_id,
        user_id=current_user.id if current_user else None,
        buyer_name=data.buyer_name,
        buyer_phone=data.buyer_phone,
        buyer_email=data.buyer_email,
        message=data.message,
        is_nri=data.is_nri,
        budget=data.budget,
        source="website",
    )
    db.add(enquiry)
    await db.flush()

    return {
        "message": "Enquiry submitted. Our broker will contact you shortly.",
        "enquiry_id": str(enquiry.id),
    }


@router.get("/enquiries", response_model=list)
async def list_enquiries(
    status: Optional[LeadStatus] = None,
    property_id: Optional[UUID] = None,
    is_nri: Optional[bool] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Broker CRM — all leads with filters."""
    conditions = []
    if status:
        conditions.append(Enquiry.status == status)
    if property_id:
        conditions.append(Enquiry.property_id == property_id)
    if is_nri is not None:
        conditions.append(Enquiry.is_nri == is_nri)

    query = select(Enquiry)
    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(
        query.order_by(Enquiry.created_at.desc()).offset(skip).limit(limit)
    )
    enquiries = result.scalars().all()
    return [EnquiryOut.model_validate(e).model_dump() for e in enquiries]


@router.patch("/enquiries/{enquiry_id}", response_model=dict)
async def update_enquiry(
    enquiry_id: UUID,
    data: EnquiryBrokerUpdate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker updates lead status, adds notes, sets follow-up date.
    address_revealed=True unlocks exact address for this specific buyer.
    """
    result = await db.execute(select(Enquiry).where(Enquiry.id == enquiry_id))
    enquiry = result.scalar_one_or_none()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(enquiry, key, value)

    return {"message": "Enquiry updated", "id": str(enquiry_id)}


@router.get("/enquiries/stats/summary", response_model=dict)
async def enquiry_stats(
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard summary stats for broker home screen."""
    from sqlalchemy import func

    result = await db.execute(
        select(Enquiry.status, func.count(Enquiry.id))
        .group_by(Enquiry.status)
    )
    stats = {row[0].value: row[1] for row in result.all()}

    return {
        "new": stats.get("new", 0),
        "contacted": stats.get("contacted", 0),
        "site_visit": stats.get("site_visit", 0),
        "negotiation": stats.get("negotiation", 0),
        "closed": stats.get("closed", 0),
        "lost": stats.get("lost", 0),
    }


# ── Seller Submissions ("Get Free Valuation") ─────────────────────────────────

@router.post("/submissions", response_model=dict, status_code=status.HTTP_201_CREATED)
async def submit_valuation_request(
    data: SellerSubmissionCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    'Get Free Valuation' form — anyone can submit.
    Goes to broker dashboard as a warm seller lead.
    Your dad calls them back, builds relationship, lists with him.
    """
    submission = SellerSubmission(
        user_id=current_user.id if current_user else None,
        seller_name=data.seller_name,
        seller_phone=data.seller_phone,
        seller_email=data.seller_email,
        property_type=data.property_type,
        listing_type=data.listing_type,
        locality=data.locality,
        area_sqft=data.area_sqft,
        bedrooms=data.bedrooms,
        asking_price=data.asking_price,
        description=data.description,
        submitted_photos=data.submitted_photos,
    )
    db.add(submission)
    await db.flush()

    return {
        "message": "Valuation request received. Our broker will contact you within 24 hours.",
        "submission_id": str(submission.id),
    }


@router.get("/submissions", response_model=list)
async def list_submissions(
    status: Optional[SubmissionStatus] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Broker sees all incoming valuation requests."""
    query = select(SellerSubmission)
    if status:
        query = query.where(SellerSubmission.status == status)

    result = await db.execute(
        query.order_by(SellerSubmission.created_at.desc()).offset(skip).limit(limit)
    )
    submissions = result.scalars().all()
    return [SellerSubmissionOut.model_validate(s).model_dump() for s in submissions]


@router.patch("/submissions/{submission_id}", response_model=dict)
async def review_submission(
    submission_id: UUID,
    data: SellerSubmissionBrokerUpdate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker accepts/rejects seller submissions.
    On accept: creates a new listing from submission data.
    """
    result = await db.execute(
        select(SellerSubmission).where(SellerSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(submission, key, value)

    # If accepted, auto-create a draft property listing
    if data.status == SubmissionStatus.accepted and not submission.converted_property_id:
        from app.models.models import Property, GoaRegion
        draft = Property(
            title=f"{submission.property_type.value.title()} in {submission.locality}",
            property_type=submission.property_type,
            listing_type=submission.listing_type,
            price=submission.asking_price or 0.0,
            locality=submission.locality,
            region=GoaRegion.north_goa,   # broker updates after reviewing
            bedrooms=submission.bedrooms,
            area_sqft=submission.area_sqft,
            description=submission.description,
            photos=submission.submitted_photos,
            created_by=broker.id,
        )
        db.add(draft)
        await db.flush()
        submission.converted_property_id = draft.id
        submission.status = SubmissionStatus.listed

        return {
            "message": "Submission accepted — draft listing created",
            "property_id": str(draft.id),
        }

    return {"message": "Submission updated"}
