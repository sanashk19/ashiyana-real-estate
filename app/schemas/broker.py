from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ── Document vault ────────────────────────────────────────────────────────────

class DocumentUpload(BaseModel):
    property_id: UUID
    name: str                    # "7/12 Extract", "NOC", "Sale Agreement"
    doc_type: str                # "title_deed", "noc", "approved_plan", "agreement"
    file_url: str                # Cloudinary URL (upload separately via /media)
    is_public: bool = False      # false = broker controls access per buyer


class DocumentAccessGrant(BaseModel):
    user_ids: List[UUID]         # broker grants these buyers access to this doc


class DocumentOut(BaseModel):
    id: UUID
    property_id: UUID
    name: str
    doc_type: str
    file_url: str
    is_public: bool
    allowed_user_ids: List[str]
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ── Valuation request (broker tool) ──────────────────────────────────────────

class ValuationRequest(BaseModel):
    locality: str
    area_sqft: float
    property_type: str
    bedrooms: int = 2
    age_years: int = 5
    beach_distance_km: float = 5.0
    mopa_airport_km: float = 30.0
    floor_number: int = 0
    region: str = "north_goa"
    furnished: str = "unfurnished"
    # Optional: link to an existing property or submission
    property_id: Optional[UUID] = None
    submission_id: Optional[UUID] = None


class ValuationOut(BaseModel):
    estimated_low: float
    estimated_mid: float
    estimated_high: float
    price_per_sqft_approx: float
    confidence_score: float
    locality_known: bool
    note: str


# ── Broker dashboard summary ──────────────────────────────────────────────────

class DashboardStats(BaseModel):
    # Listings
    total_active_listings: int
    total_sold: int
    total_rented: int
    featured_count: int
    # Leads
    new_enquiries: int
    enquiries_today: int
    follow_ups_due: int          # leads with follow_up_date <= today
    # Submissions
    pending_submissions: int
    # Top performing
    most_viewed_property_id: Optional[str]
    most_viewed_property_title: Optional[str]
    most_viewed_count: int
