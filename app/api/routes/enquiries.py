from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
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
    is_archived: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Broker CRM — leads with filters. Default returns active (non-archived) leads."""
    conditions = [Enquiry.is_archived == is_archived]
    if status:
        conditions.append(Enquiry.status == status)
    if property_id:
        conditions.append(Enquiry.property_id == property_id)
    if is_nri is not None:
        conditions.append(Enquiry.is_nri == is_nri)

    query = select(Enquiry).options(selectinload(Enquiry.property))
    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(
        query.order_by(Enquiry.created_at.desc()).offset(skip).limit(limit)
    )
    enquiries = result.scalars().all()
    out = []
    for e in enquiries:
        item = EnquiryOut.model_validate(e)
        if e.property:
            item.property_title = f"{e.property.title} ({e.property.locality})"
        out.append(item.model_dump())
    return out


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

    await db.commit()
    await db.refresh(enquiry)

    return {"message": "Enquiry updated", "id": str(enquiry_id)}


@router.patch("/enquiries/{enquiry_id}/archive", response_model=dict)
async def archive_enquiry(
    enquiry_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker soft-deletes/archives an enquiry to clean the active CRM board without data loss.
    """
    result = await db.execute(select(Enquiry).where(Enquiry.id == enquiry_id))
    enquiry = result.scalar_one_or_none()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    enquiry.is_archived = True
    await db.commit()

    return {"message": "Enquiry archived successfully", "id": str(enquiry_id), "is_archived": True}


@router.patch("/enquiries/{enquiry_id}/unarchive", response_model=dict)
async def unarchive_enquiry(
    enquiry_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker restores an archived enquiry back to the active CRM board.
    """
    result = await db.execute(select(Enquiry).where(Enquiry.id == enquiry_id))
    enquiry = result.scalar_one_or_none()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    enquiry.is_archived = False
    await db.commit()

    return {"message": "Enquiry restored to active CRM", "id": str(enquiry_id), "is_archived": False}


@router.get("/enquiries/stats/summary", response_model=dict)
async def enquiry_stats(
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard summary stats for active leads (excludes archived)."""
    from sqlalchemy import func

    result = await db.execute(
        select(Enquiry.status, func.count(Enquiry.id))
        .where(Enquiry.is_archived == False)
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
    await db.commit()
    await db.refresh(submission)

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

    # If accepted or listed, auto-create an active property listing
    if data.status in [SubmissionStatus.accepted, SubmissionStatus.listed] and not submission.converted_property_id:
        from app.models.models import Property, PropertyImage, GoaRegion, PossessionStatus, PropertyStatus
        draft = Property(
            title=f"{submission.property_type.value.title()} in {submission.locality}",
            property_type=submission.property_type,
            listing_type=submission.listing_type,
            status=PropertyStatus.active,
            price=submission.asking_price or 0.0,
            locality=submission.locality,
            region=GoaRegion.north_goa,   # broker updates after reviewing
            bedrooms=submission.bedrooms,
            bathrooms=2,
            area_sqft=submission.area_sqft,
            description=submission.description,
            connectivity_score=8,
            possession_status=PossessionStatus.ready_to_move,
            nri_eligible=True,
            fema_compliant=True,
            price_negotiable=True,
            created_by=broker.id,
        )
        db.add(draft)
        await db.flush()

        if submission.submitted_photos:
            for idx, photo_url in enumerate(submission.submitted_photos):
                img = PropertyImage(
                    property_id=draft.id,
                    image_url=photo_url,
                    display_order=idx + 1,
                    is_thumbnail=(idx == 0),
                )
                db.add(img)
            await db.flush()

        submission.converted_property_id = draft.id
        submission.status = SubmissionStatus.listed
        await db.commit()

        return {
            "message": "Submission accepted — listing created",
            "property_id": str(draft.id),
            "converted_property_id": str(draft.id),
            "status": submission.status.value,
        }

    await db.commit()
    return {
        "message": "Submission updated",
        "id": str(submission_id),
        "status": submission.status.value,
        "converted_property_id": str(submission.converted_property_id) if submission.converted_property_id else None,
    }
