from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
import cloudinary
import cloudinary.uploader

from app.core.config import settings
from app.db.database import get_db
from app.core.dependencies import get_current_user, get_optional_user, require_broker, require_registered_user
from app.models.models import User, UserRole, PropertyType, ListingType, GoaRegion, PropertyStatus
from app.schemas.properties import (
    PropertyCreate, PropertyUpdate, PropertyFilters,
    PropertyPublic, PropertyBroker, PropertyCard,
    PropertyImageResponse, PropertyImageCreate, PropertyImageBatchCreate,
    PropertyImageReorderRequest, PropertyWatcherItem,
)
from app.services.property_service import PropertyService

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

router = APIRouter(prefix="/properties", tags=["properties"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


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
    limit: int = Query(default=20, ge=1, le=100),
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

    # Broker gets full details
    if current_user and current_user.role == UserRole.broker:
        response_data = PropertyBroker.model_validate(prop).model_dump(mode="json")
    else:
        # Everyone else gets public response — address never included
        response_data = PropertyPublic.model_validate(prop).model_dump(mode="json")

    # Increment view count for active listings
    if prop.status == PropertyStatus.active:
        await PropertyService.increment_view(db, prop)

    return response_data


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

@router.get("/{property_id}/watchers", response_model=List[PropertyWatcherItem])
async def property_watchers(
    property_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Lead intelligence: which registered buyers saved this property.
    Broker-only endpoint.
    """
    return await PropertyService.get_watchers(db, property_id)


import os
import uuid

# ── Property Image Management ──────────────────────────────────────────────────

@router.get("/{property_id}/images", response_model=List[PropertyImageResponse])
async def list_property_images(
    property_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public: list all images for a property in display order."""
    prop = await PropertyService.get_by_id(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    images = await PropertyService.get_images(db, property_id)
    return [PropertyImageResponse.model_validate(img) for img in images]


@router.post(
    "/{property_id}/images/upload",
    response_model=List[PropertyImageResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_property_images(
    property_id: UUID,
    files: List[UploadFile] = File(...),
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker only: upload up to 10 photos.
    Uses Cloudinary when real credentials are provided; gracefully uses local static uploads for local development.
    """
    prop = await PropertyService.get_by_id(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Max 10 photos per upload batch")

    image_creates: List[PropertyImageCreate] = []
    has_cloudinary_config = (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_CLOUD_NAME not in ["your-cloud-name", "your_cloud_name", ""]
        and settings.CLOUDINARY_API_KEY not in ["your-api-key", "your_api_key", ""]
    )

    for file in files:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, WebP.",
            )

        content = await file.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"{file.filename} exceeds 10MB limit.",
            )

        image_url = None
        if has_cloudinary_config:
            try:
                result = cloudinary.uploader.upload(
                    content,
                    folder=f"ashiyana/properties/{property_id}",
                    transformation=[
                        {"width": 1920, "height": 1080, "crop": "limit", "quality": "auto"},
                    ],
                )
                image_url = result.get("secure_url")
            except Exception as e:
                # Log and fallback to local storage
                print(f"Cloudinary upload warning: {e}. Falling back to local static storage.")

        if not image_url:
            # Local storage fallback for development
            upload_dir = os.path.join("uploads", "properties", str(property_id))
            os.makedirs(upload_dir, exist_ok=True)
            # Sanitize or randomize filename to prevent collision
            clean_filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
            file_path = os.path.join(upload_dir, clean_filename)
            with open(file_path, "wb") as f:
                f.write(content)
            image_url = f"http://127.0.0.1:8000/uploads/properties/{property_id}/{clean_filename}"

        image_creates.append(
            PropertyImageCreate(
                image_url=image_url,
                caption=file.filename,
            )
        )

    created_images = await PropertyService.add_images(db, property_id, image_creates)
    return [PropertyImageResponse.model_validate(img) for img in created_images]


@router.post(
    "/{property_id}/images",
    response_model=List[PropertyImageResponse],
    status_code=status.HTTP_201_CREATED,
)
async def attach_property_images(
    property_id: UUID,
    data: PropertyImageBatchCreate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker only: attach pre-uploaded Cloudinary URLs to a property.
    """
    prop = await PropertyService.get_by_id(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    created = await PropertyService.add_images(db, property_id, data.images)
    return [PropertyImageResponse.model_validate(img) for img in created]


@router.delete("/{property_id}/images/{image_id}", response_model=dict)
async def delete_property_image(
    property_id: UUID,
    image_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker only: delete an image from the property and database.
    """
    prop = await PropertyService.get_by_id(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    deleted = await PropertyService.delete_image(db, property_id, image_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Image not found on this property")

    return {"message": "Image deleted successfully"}


@router.patch("/{property_id}/images/reorder", response_model=List[PropertyImageResponse])
async def reorder_property_images(
    property_id: UUID,
    data: PropertyImageReorderRequest,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker only: reorder property images by updating display_order.
    """
    prop = await PropertyService.get_by_id(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    updated = await PropertyService.reorder_images(db, property_id, data.items)
    return [PropertyImageResponse.model_validate(img) for img in updated]


@router.patch("/{property_id}/images/{image_id}/thumbnail", response_model=PropertyImageResponse)
async def set_property_thumbnail(
    property_id: UUID,
    image_id: UUID,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker only: set a specific image as the primary cover thumbnail.
    """
    prop = await PropertyService.get_by_id(db, property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    thumb = await PropertyService.set_thumbnail(db, property_id, image_id)
    if not thumb:
        raise HTTPException(status_code=404, detail="Image not found on this property")

    return PropertyImageResponse.model_validate(thumb)

