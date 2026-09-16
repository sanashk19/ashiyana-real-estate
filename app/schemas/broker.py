from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


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


# ── Broker Seller Management Schemas ──────────────────────────────────────────

class BrokerSellerListItemOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    submissions_count: int
    listed_properties_count: int
    documents_count: int

    class Config:
        from_attributes = True


class BrokerSellerDetailOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    submissions: List[dict]
    listed_properties: List[dict]
    documents: List[dict]

    class Config:
        from_attributes = True
