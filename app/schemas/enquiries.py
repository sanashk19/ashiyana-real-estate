from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.models import LeadStatus, SubmissionStatus, PropertyType, ListingType


# ── Enquiry (buyer inquiry — routes through broker always) ────────────────────

class EnquiryCreate(BaseModel):
    property_id: UUID
    buyer_name: str
    buyer_phone: str
    buyer_email: Optional[EmailStr] = None
    message: Optional[str] = None
    is_nri: bool = False
    budget: Optional[float] = None


class EnquiryBrokerUpdate(BaseModel):
    """Broker updates lead status, adds notes, sets follow-up."""
    status: Optional[LeadStatus] = None
    broker_notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    address_revealed: Optional[bool] = None  # broker explicitly unlocks address for this buyer


class EnquiryOut(BaseModel):
    id: UUID
    property_id: UUID
    buyer_name: str
    buyer_phone: str
    buyer_email: Optional[str]
    message: Optional[str]
    is_nri: bool
    budget: Optional[float]
    source: str
    status: LeadStatus
    broker_notes: Optional[str]
    follow_up_date: Optional[datetime]
    address_revealed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Seller submission ("Get Free Valuation" form) ─────────────────────────────

class SellerSubmissionCreate(BaseModel):
    seller_name: str
    seller_phone: str
    seller_email: Optional[EmailStr] = None
    property_type: PropertyType
    listing_type: ListingType
    locality: str
    area_sqft: Optional[float] = None
    bedrooms: Optional[int] = None
    asking_price: Optional[float] = None
    description: Optional[str] = None
    # Photos uploaded separately via /upload endpoint, URLs passed here
    submitted_photos: List[str] = []


class SellerSubmissionBrokerUpdate(BaseModel):
    status: Optional[SubmissionStatus] = None
    broker_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class SellerSubmissionOut(BaseModel):
    id: UUID
    seller_name: str
    seller_phone: str
    seller_email: Optional[str]
    property_type: PropertyType
    listing_type: ListingType
    locality: str
    area_sqft: Optional[float]
    bedrooms: Optional[int]
    asking_price: Optional[float]
    description: Optional[str]
    submitted_photos: List[str]
    status: SubmissionStatus
    broker_notes: Optional[str]
    rejection_reason: Optional[str]
    converted_property_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True
