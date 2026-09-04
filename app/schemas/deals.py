from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.models import DealStatus, DocumentCategory


class DealDocumentOut(BaseModel):
    id: UUID
    deal_id: UUID
    category: DocumentCategory
    title: str
    original_filename: str
    resource_type: str
    mime_type: str
    file_size: int
    created_at: datetime
    updated_at: datetime
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DealPropertyInfo(BaseModel):
    id: UUID
    title: str
    locality: str
    price: float
    property_type: str
    thumbnail_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DealCreate(BaseModel):
    property_id: Optional[UUID] = None
    seller_name: Optional[str] = Field(None, max_length=255)
    buyer_name: Optional[str] = Field(None, max_length=255)
    status: DealStatus = DealStatus.inquiry
    notes: Optional[str] = None


class DealUpdate(BaseModel):
    property_id: Optional[UUID] = None
    seller_name: Optional[str] = Field(None, max_length=255)
    buyer_name: Optional[str] = Field(None, max_length=255)
    status: Optional[DealStatus] = None
    notes: Optional[str] = None
    closed_at: Optional[datetime] = None


class DealOut(BaseModel):
    id: UUID
    deal_number: str
    property_id: Optional[UUID] = None
    property: Optional[DealPropertyInfo] = None
    seller_name: Optional[str] = None
    buyer_name: Optional[str] = None
    status: DealStatus
    notes: Optional[str] = None
    document_count: int = 0
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DealDetailOut(DealOut):
    documents: List[DealDocumentOut] = []


class DealListResponse(BaseModel):
    total: int
    deals: List[DealOut]


class DealDocumentUploadResponse(BaseModel):
    message: str
    document: DealDocumentOut
