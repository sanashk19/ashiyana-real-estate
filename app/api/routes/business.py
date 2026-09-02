from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.db.database import get_db
from app.models.models import BusinessProfile, User
from app.schemas.business import BusinessProfileOut, BusinessProfileUpdate
from app.core.dependencies import require_broker

router = APIRouter(prefix="/business", tags=["Business Profile"])

async def get_or_create_business_profile(db: AsyncSession) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).limit(1))
    profile = result.scalar_one_or_none()
    if not profile:
        profile = BusinessProfile(
            broker_name="Kassim Shaikh",
            broker_role="Lead Broker & Founder",
            company_name="Ashiyana Real Estate",
            phone="+91 8888083558",
            whatsapp_number="918888083558",
            email="ashiyanarentbuysell@gmail.com",
            office_address="Calangute & Panaji, Goa, India",
            facebook_url=None,
            instagram_url=None,
            olx_url=None,
        )
        db.add(profile)
        await db.flush()
    return profile

@router.get("/profile", response_model=BusinessProfileOut)
async def get_public_business_profile(db: AsyncSession = Depends(get_db)):
    """
    Public endpoint: Get the single source of truth for Ashiyana broker and business contact details,
    including official phone, WhatsApp number, email, address, and configured social media links.
    """
    profile = await get_or_create_business_profile(db)
    return profile

@router.put("/profile", response_model=BusinessProfileOut)
async def update_business_profile(
    data: BusinessProfileUpdate,
    broker: User = Depends(require_broker),
    db: AsyncSession = Depends(get_db),
):
    """
    Broker-only: Update business contact information and social media links (Facebook, Instagram, OLX).
    Saves directly to PostgreSQL.
    """
    profile = await get_or_create_business_profile(db)
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(profile, key, value)
    await db.flush()
    await db.refresh(profile)
    return profile
