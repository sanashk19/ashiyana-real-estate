from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class BusinessProfileBase(BaseModel):
    broker_name: str = "Kassim Shaikh"
    broker_role: str = "Lead Broker & Founder"
    company_name: str = "Ashiyana Real Estate"
    phone: str = "+91 8888083558"
    whatsapp_number: str = "918888083558"
    email: str = "ashiyanarentbuysell@gmail.com"
    office_address: str = "Calangute & Panaji, Goa, India"
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    olx_url: Optional[str] = None

class BusinessProfileUpdate(BaseModel):
    broker_name: Optional[str] = None
    broker_role: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    office_address: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    olx_url: Optional[str] = None

class BusinessProfileOut(BusinessProfileBase):
    id: UUID
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
