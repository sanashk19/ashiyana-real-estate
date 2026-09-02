import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.models import LeadStatus, SubmissionStatus, PropertyType, ListingType


def validate_phone_number(v: str) -> str:
    if not v or not isinstance(v, str):
        raise ValueError("Phone number is required.")
    cleaned = re.sub(r"[\s\-\(\)\.]", "", v.strip())
    # Must contain only digits and optional leading plus, between 7 and 15 digits
    if not re.match(r"^\+?[0-9]{7,15}$", cleaned):
        raise ValueError("Please provide a valid phone number with digits (e.g. +91 95112 93464 or 9876543210). Alphabets are not allowed.")
    return v.strip()


# ── Enquiry (buyer inquiry — routes through broker always) ────────────────────

class EnquiryCreate(BaseModel):
    property_id: UUID
    buyer_name: str
    buyer_phone: str
    buyer_email: Optional[EmailStr] = None
    message: Optional[str] = None
    is_nri: bool = False
    budget: Optional[float] = None

    @field_validator("buyer_phone")
    @classmethod
    def validate_buyer_phone(cls, v: str) -> str:
        return validate_phone_number(v)


class EnquiryBrokerUpdate(BaseModel):
    """Broker updates lead status, adds notes, sets follow-up."""
    status: Optional[LeadStatus] = None
    broker_notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    address_revealed: Optional[bool] = None  # broker explicitly unlocks address for this buyer


class EnquiryOut(BaseModel):
    id: UUID
    property_id: UUID
    property_title: Optional[str] = None
    buyer_name: str
    buyer_phone: str
    buyer_email: Optional[str] = None
    message: Optional[str] = None
    is_nri: bool
    budget: Optional[float] = None
    source: str
    status: LeadStatus
    broker_notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
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

    @field_validator("seller_phone")
    @classmethod
    def validate_seller_phone(cls, v: str) -> str:
        return validate_phone_number(v)


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
