from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.models import DealStatus, DocumentCategory


class DealPartyInfo(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DealChecklistItem(BaseModel):
    category: str
    title: str
    party: Optional[str] = None
    required: bool = True
    status: str = "pending"  # "pending", "uploaded", "verified"
    document_id: Optional[UUID] = None


class DealDocumentOut(BaseModel):
    id: UUID
    deal_id: UUID
    category: DocumentCategory
    title: str
    original_filename: str
    resource_type: str
    mime_type: str
    file_size: int
    party: Optional[str] = None
    document_side: Optional[str] = None
    is_verified: bool = False
    verified_at: Optional[datetime] = None
    verified_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DealDocumentVerifyRequest(BaseModel):
    is_verified: bool = True


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
    buyer: Optional[DealPartyInfo] = None
    seller: Optional[DealPartyInfo] = None
    buyer_phone: Optional[str] = Field(None, max_length=50)
    buyer_email: Optional[str] = Field(None, max_length=255)
    buyer_address: Optional[str] = None
    buyer_notes: Optional[str] = None
    seller_phone: Optional[str] = Field(None, max_length=50)
    seller_email: Optional[str] = Field(None, max_length=255)
    seller_address: Optional[str] = None
    seller_notes: Optional[str] = None
    status: DealStatus = DealStatus.inquiry
    notes: Optional[str] = None


class DealUpdate(BaseModel):
    property_id: Optional[UUID] = None
    seller_name: Optional[str] = Field(None, max_length=255)
    buyer_name: Optional[str] = Field(None, max_length=255)
    buyer: Optional[DealPartyInfo] = None
    seller: Optional[DealPartyInfo] = None
    buyer_phone: Optional[str] = Field(None, max_length=50)
    buyer_email: Optional[str] = Field(None, max_length=255)
    buyer_address: Optional[str] = None
    buyer_notes: Optional[str] = None
    seller_phone: Optional[str] = Field(None, max_length=50)
    seller_email: Optional[str] = Field(None, max_length=255)
    seller_address: Optional[str] = None
    seller_notes: Optional[str] = None
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
    buyer: Optional[DealPartyInfo] = None
    seller: Optional[DealPartyInfo] = None
    status: DealStatus
    notes: Optional[str] = None
    document_count: int = 0
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DealDetailOut(DealOut):
    documents: List[DealDocumentOut] = []
    checklist: List[DealChecklistItem] = []


class DealListResponse(BaseModel):
    total: int
    deals: List[DealOut]


class DealDocumentUploadResponse(BaseModel):
    message: str
    document: DealDocumentOut


class DealUploadRequestCreate(BaseModel):
    party: str = Field(..., description="buyer or seller")
    requested_docs: List[str] = Field(default_factory=list)
    message: Optional[str] = None
    valid_days: int = Field(default=7, ge=1, le=30)


class DealUploadRequestOut(BaseModel):
    id: UUID
    deal_id: UUID
    party: str
    requested_docs: List[str]
    message: Optional[str] = None
    expires_at: datetime
    is_revoked: bool
    created_at: datetime
    updated_at: datetime
    upload_token: Optional[str] = None
    shareable_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PublicUploadRequestVerifyOut(BaseModel):
    valid: bool
    deal_number: str
    party: str
    requested_docs: List[str]
    message: Optional[str] = None
    expires_at: datetime
    broker_name: Optional[str] = "Kassim Shaikh"


class ClientDocumentUploadResponse(BaseModel):
    success: bool
    message: str
    document_title: str
    document_side: Optional[str] = None
    original_filename: str


class DealPrintPackRequest(BaseModel):
    document_ids: List[UUID]
    include_cover_page: bool = True


class PrintPackPreviewItemOut(BaseModel):
    item_type: str  # "paired", "single_image", "pdf"
    title: str
    party: str
    document_ids: List[UUID]
    filenames: List[str]
    estimated_pages: int


class DealPrintPackPreviewOut(BaseModel):
    deal_id: UUID
    deal_number: str
    total_documents_selected: int
    paired_documents_count: int
    standalone_documents_count: int
    estimated_total_pages: int
    include_cover_page: bool
    items: List[PrintPackPreviewItemOut]

