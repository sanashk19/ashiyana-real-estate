from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.core.dependencies import get_current_user, get_optional_user, require_broker, require_registered_user
from app.models.models import User, UserRole, PropertyType, ListingType, GoaRegion, PropertyStatus
from app.schemas.properties import (
    PropertyCreate, PropertyUpdate, PropertyFilters,
    PropertyPublic, PropertyBroker, PropertyCard,
)
from app.services.property_service import PropertyService

router = APIRouter(prefix="/properties", tags=["properties"])


# ── Public: search / browse ────────────────────────────────────────────────────

@router.get("", response_model=dict)
async def list_properties(
    property_type: Optional[PropertyType] = None,
    listing_type: Optional[ListingType] = None,
    region: Optional[GoaRegion] = None,
    locality: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bedrooms: Optional[int] = None,
    furnished: Optional[str] = None,
    nri_eligible: Optional[bool] = None,
    short_term_rental: Optional[bool] = None,
    
    is_featured: Optional[bool] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — returns PropertyCard (lightweight).
    No address, no exact location, no broker info.
    """
    filters = PropertyFilters(
        property_type=property_type,
        listing_type=listing_type,
        region=region,
        locality=locality,
        min_price=min_price,
        max_price=max_price,
        bedrooms=bedrooms,
        furnished=furnished,
        nri_eligible=nri_eligible,
        short_term_rental_potential=short_term_rental,
        
        is_featured=is_featured,
        status=PropertyStatus.active,
        skip=skip,
        limit=limit,
    )
    properties, total = await PropertyService.search(db, filters)
    cards = [PropertyCard.model_validate(p) for p in properties]

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "results": [c.model_dump() for c in cards],
    }


@router.get("/featured", response_model=list)
async def featured_properties(
    db: AsyncSession = Depends(get_db),
):
    """Homepage featured listings — max 6."""
    filters = PropertyFilters(is_featured=True, limit=6, status=PropertyStatus.active)
    properties, _ = await PropertyService.search(db, filters)
    return [PropertyCard.model_validate(p).model_dump() for p in properties]

@router.get("/saved/mine", response_model=list)
async def my_saved_properties(
    current_user: User = Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    properties = await PropertyService.get_saved_by_user(db, current_user.id)
    return [PropertyCard.model_validate(p).model_dump() for p in properties]


@router.get("/{property_id}")
async def get_property(
    property_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Public: returns PropertyPublic (no address).
    Broker: returns PropertyBroker (full address + exact coords).
    """
    prop = await PropertyService.get_by_id(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Increment view count for active listings
    if prop.status == PropertyStatus.active:
        await PropertyService.increment_view(db, prop)

    # Broker gets full details
    if current_user and current_user.role == UserRole.broker:
        return PropertyBroker.model_validate(prop).model_dump()

    # Everyone else gets public response — address never included
    return PropertyPublic.model_validate(prop).model_dump()


# ── Broker: create / edit / delete ────────────────────────────────────────────

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_property(
    data: PropertyCreate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    prop = await PropertyService.create(db, data, broker.id)
    return {"id": str(prop.id), "message": "Property listed successfully"}


@router.patch("/{property_id}", response_model=dict)
async def update_property(
    property_id: UUID,
    data: PropertyUpdate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    prop = await PropertyService.get_by_id(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    updated = await PropertyService.update(db, prop, data)
    return {"id": str(updated.id), "message": "Property updated"}


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    prop = await PropertyService.get_by_id(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    await PropertyService.delete(db, prop)


# ── Registered users: save / unsave ───────────────────────────────────────────

@router.post("/{property_id}/save", response_model=dict)
async def save_property(
    property_id: UUID,
    current_user: User = Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    saved = await PropertyService.save_property(db, current_user.id, property_id)
    if not saved:
        return {"message": "Already saved"}
    return {"message": "Property saved"}


@router.delete("/{property_id}/save", response_model=dict)
async def unsave_property(
    property_id: UUID,
    current_user: User = Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    removed = await PropertyService.unsave_property(db, current_user.id, property_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Not in saved list")
    return {"message": "Removed from saved"}




# ── Broker only: see who's watching a property ────────────────────────────────

@router.get("/{property_id}/watchers", response_model=list)
async def property_watchers(
    property_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Lead intelligence: which registered buyers saved this property.
    Broker-only endpoint.
    """
    watchers = await PropertyService.get_watchers(db, property_id)
    return [
        {"user_id": str(w.user_id), "saved_at": w.saved_at.isoformat()}
        for w in watchers
    ]
