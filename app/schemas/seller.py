from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.models import PropertyType, ListingType, SubmissionStatus, PropertyStatus
import re


def validate_phone_number(v: str) -> str:
    if not v or not isinstance(v, str):
        raise ValueError("Phone number is required.")
    cleaned = re.sub(r"[\s\-\(\)\.]", "", v.strip())
    if not re.match(r"^\+?[0-9]{7,15}$", cleaned):
        raise ValueError("Please provide a valid phone number with 7-15 digits (e.g. +91 95112 93464 or 9876543210).")
    return v.strip()


# ── Seller Auth ───────────────────────────────────────────────────────────────

class SellerRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str

    @field_validator("phone")
    @classmethod
    def validate_seller_phone(cls, v: str) -> str:
        return validate_phone_number(v)

    @field_validator("password")
    @classmethod
    def validate_seller_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters.")
        return v


class SellerLogin(BaseModel):
    email: EmailStr
    password: str


class SellerProfileOut(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Seller Document Schemas ───────────────────────────────────────────────────

class SellerDocumentOut(BaseModel):
    id: UUID
    user_id: UUID
    submission_id: Optional[UUID] = None
    title: str
    doc_type: str
    original_filename: str
    file_size: int
    mime_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class SellerDocumentUploadResponse(BaseModel):
    message: str
    document: SellerDocumentOut


# ── Seller Submission & Properties ───────────────────────────────────────────

class SellerSubmissionCardOut(BaseModel):
    id: UUID
    property_type: PropertyType
    listing_type: ListingType
    locality: str
    area_sqft: Optional[float] = None
    bedrooms: Optional[int] = None
    asking_price: Optional[float] = None
    description: Optional[str] = None
    submitted_photos: List[str] = []
    status: SubmissionStatus
    broker_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    converted_property_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SellerListedPropertyOut(BaseModel):
    id: UUID
    title: str
    property_type: PropertyType
    listing_type: ListingType
    locality: str
    price: float
    status: PropertyStatus
    thumbnail_url: Optional[str] = None
    view_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Seller Dashboard ──────────────────────────────────────────────────────────

class SellerDashboardStats(BaseModel):
    total_submissions: int
    pending_submissions: int
    listed_properties: int
    total_documents: int
    seller_name: str
    seller_email: str
