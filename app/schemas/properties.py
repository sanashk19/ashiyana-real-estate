from pydantic import BaseModel, field_validator, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.models import (
    PropertyType,
    ListingType,
    PropertyStatus,
    PossessionStatus,
    GoaRegion,
    Facing,
)


# ── Shared base ────────────────────────────────────────────────────────────────

class PropertyBase(BaseModel):
    title: str
    description: Optional[str] = None
    property_type: PropertyType
    listing_type: ListingType
    price: float
    price_negotiable: bool = True
    security_deposit: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_sqft: Optional[float] = None
    floor_number: Optional[int] = None
    total_floors: Optional[int] = None
    age_years: Optional[int] = None
    furnished: Optional[str] = None
    facing: Optional[Facing]
    locality: str
    village: Optional[str] = None
    taluka: Optional[str] = None
    region: GoaRegion
    pin_code: Optional[str] = None
    amenities: List[str] = []
    nri_eligible: bool = True
    fema_compliant: bool = True
    
    possession_status: Optional[PossessionStatus]


# ── Broker creates/edits listing ───────────────────────────────────────────────

class PropertyCreate(PropertyBase):
    # Full address — stored in DB but NEVER sent in public responses
    full_address: Optional[str] = None
    exact_lat: Optional[float] = None
    exact_lng: Optional[float] = None
    # Approx coordinates for public map marker
    approx_lat: Optional[float] = None
    approx_lng: Optional[float] = None
    # Goa intelligence tags
    beach_distance_km: Optional[float] = None
    mopa_airport_km: Optional[float] = None
    dabolim_airport_km: Optional[float] = None

    tourist_density: Optional[str] = None
    short_term_rental_potential: bool = False
    connectivity_score: int = Field(
        ge=1,
        le=10
    )
    is_featured: bool = False
    property_video_url: Optional[str] = None
    
    facing: Optional[Facing]
    possession_status: Optional[PossessionStatus]
    

class PropertyImageResponse(BaseModel):
    id: UUID
    image_url: str
    caption: Optional[str]
    display_order: int
    is_thumbnail: bool

    class Config:
        from_attributes = True
        
class PropertyUpdate(BaseModel):
    """All fields optional for PATCH updates."""
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    price_negotiable: Optional[bool] = None
    status: Optional[PropertyStatus] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_sqft: Optional[float] = None
    furnished: Optional[str] = None
    amenities: Optional[List[str]] = None
    beach_distance_km: Optional[float] = None

    tourist_density: Optional[str] = None
    is_featured: Optional[bool] = None
    property_video_url: Optional[str] = None
    facing: Optional[Facing]
    possession_status: Optional[PossessionStatus]
    


# ── Public response — NO address, NO exact location, NO full_address ──────────

class PropertyPublic(BaseModel):
    """
    Sent to any visitor or registered buyer.
    Deliberately excludes: full_address, exact_location, created_by.
    Approximate coordinates only for map marker.
    """
    id: UUID
    title: str
    description: Optional[str]
    property_type: PropertyType
    listing_type: ListingType
    status: PropertyStatus
    price: float
    price_negotiable: bool
    security_deposit: Optional[float]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    area_sqft: Optional[float]
    floor_number: Optional[int]
    total_floors: Optional[int]
    age_years: Optional[int]
    furnished: Optional[str]
    facing: Optional[Facing]
    locality: str
    village: Optional[str]
    region: GoaRegion
    # Approximate only — exact address never sent
    approx_lat: Optional[float]
    approx_lng: Optional[float]
    # Goa intelligence
    beach_distance_km: Optional[float]
    mopa_airport_km: Optional[float]
    dabolim_airport_km: Optional[float]

    tourist_density: Optional[str]
    short_term_rental_potential: bool
    connectivity_score: Optional[int]
    # Media
    images: List[PropertyImageResponse]
    property_video_url: Optional[str]
    possession_status: Optional[PossessionStatus]
    
    amenities: List[str]
    nri_eligible: bool
    fema_compliant: bool
    is_featured: bool
    view_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Broker response — full details including address ──────────────────────────

class PropertyBroker(PropertyPublic):
    """
    Only returned to broker role.
    Adds: full_address, exact coordinates, lead count.
    """
    full_address: Optional[str]
    pin_code: Optional[str]
    created_by: Optional[UUID]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Listing card for search results (lightweight) ─────────────────────────────

class PropertyCard(BaseModel):
    id: UUID
    title: str
    property_type: PropertyType
    listing_type: ListingType
    status: PropertyStatus
    price: float
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    area_sqft: Optional[float]
    locality: str
    region: GoaRegion
    
    is_featured: bool
    beach_distance_km: Optional[float]

    nri_eligible: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Filters for search ────────────────────────────────────────────────────────

class PropertyFilters(BaseModel):
    property_type: Optional[PropertyType] = None
    listing_type: Optional[ListingType] = None
    region: Optional[GoaRegion] = None
    locality: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    bedrooms: Optional[int] = None
    furnished: Optional[str] = None
    nri_eligible: Optional[bool] = None
    short_term_rental_potential: Optional[bool] = None
    
    is_featured: Optional[bool] = None
    status: Optional[PropertyStatus] = PropertyStatus.active
    skip: int = 0
    limit: int = 20

    @field_validator("limit")
    def cap_limit(cls, v):
        return min(v, 50)
