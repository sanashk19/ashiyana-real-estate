from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text,
    ForeignKey, DateTime, JSON, func
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from enum import Enum as PyEnum
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import CheckConstraint
from app.db.database import Base
from sqlalchemy import Numeric
import uuid

# ── Enums ──────────────────────────────────────────────────────────────────────

class UserRole(str, PyEnum):
    broker = "broker"       # Lead broker (Kassim Shaikh) — full access
    seller = "seller"       # Registered property owner / seller
    user = "user"           # Registered user
    public = "public"       # Unauthenticated visitor


class PropertyType(str, PyEnum):
    flat = "flat"
    studio = "studio"
    villa = "villa"
    bungalow = "bungalow"
    duplex = "duplex"
    penthouse = "penthouse"
    farmhouse = "farmhouse"

    plot = "plot"

    commercial = "commercial"
    office = "office"
    shop = "shop"
    showroom = "showroom"
    warehouse = "warehouse"
    coworking = "coworking"


class ListingType(str, PyEnum):
    sale = "sale"
    rent = "rent"
    lease = "lease"


class PropertyStatus(str, PyEnum):
    active = "active"
    sold = "sold"
    rented = "rented"
    reserved = "reserved"
    under_negotiation = "under_negotiation"
    inactive = "inactive"

class PossessionStatus(str, PyEnum):
    ready_to_move = "ready_to_move"
    under_construction = "under_construction"


class LeadStatus(str, PyEnum):
    new = "new"
    contacted = "contacted"
    site_visit = "site_visit"
    negotiation = "negotiation"
    closed = "closed"
    lost = "lost"


class SubmissionStatus(str, PyEnum):
    pending = "pending"
    reviewing = "reviewing"
    accepted = "accepted"
    rejected = "rejected"
    listed = "listed"


class DealStatus(str, PyEnum):
    inquiry = "inquiry"
    negotiation = "negotiation"
    agreement = "agreement"
    completed = "completed"
    cancelled = "cancelled"


class DocumentCategory(str, PyEnum):
    property = "property"
    seller = "seller"
    buyer = "buyer"
    legal = "legal"
    financial = "financial"
    other = "other"


class GoaRegion(str, PyEnum):
    north_goa = "north_goa"
    south_goa = "south_goa"
    central_goa = "central_goa"

class Facing(str, PyEnum):
    north = "north"
    south = "south"
    east = "east"
    west = "west"

    north_east = "north_east"
    north_west = "north_west"
    south_east = "south_east"
    south_west = "south_west"

# ── Models ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)  # null for Google OAuth users
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(SQLEnum(UserRole, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), default=UserRole.user, nullable=False)
    is_active = Column(Boolean, default=True)
    is_nri = Column(Boolean, default=False)  # enables NRI mode on frontend
    google_id = Column(String(255), nullable=True, unique=True)
    refresh_token = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    enquiries = relationship("Enquiry", back_populates="user", cascade="all, delete-orphan")
    saved_properties = relationship("SavedProperty", back_populates="user", cascade="all, delete-orphan")
    seller_submissions = relationship("SellerSubmission", back_populates="user")


class Property(Base):
    __tablename__ = "properties"
    __table_args__ = (
        CheckConstraint(
            "connectivity_score >= 1 AND connectivity_score <= 10",
            name="check_connectivity_score",
        ),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    property_type = Column(
        SQLEnum(
            PropertyType,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=30,
        ),
        nullable=False,
    )

     
    listing_type = Column(SQLEnum(ListingType, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), nullable=False)
    status = Column(SQLEnum(PropertyStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), default=PropertyStatus.active)
    possession_status = Column(SQLEnum(PossessionStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), default=PossessionStatus.ready_to_move)

    # Pricing — broker controls this, no public estimator
    price = Column(
        Numeric(15, 2),
        nullable=False
    )
    price_negotiable = Column(Boolean, default=True)
    security_deposit = Column(
        Numeric(15, 2),
        nullable=True
    )

    # Property details
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Integer, nullable=True)
    area_sqft = Column(Float, nullable=True)
    area_sqmt = Column(Float, nullable=True)
    floor_number = Column(Integer, nullable=True)
    total_floors = Column(Integer, nullable=True)
    age_years = Column(Integer, nullable=True)
    furnished = Column(String(50), nullable=True)   # furnished/semi/unfurnished
    facing = Column(SQLEnum(Facing, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), nullable=True)      # north/south/east/west/sea-facing

    # Location — address NEVER exposed publicly
    locality = Column(String(255), nullable=False, index=True)  # e.g. "Calangute"
    village = Column(String(255), nullable=True)
    taluka = Column(String(255), nullable=True)
    region = Column(SQLEnum(GoaRegion, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), nullable=False)
    full_address = Column(Text, nullable=True)  # broker-only, never sent to public API
    pin_code = Column(String(10), nullable=True)

    # Approximate coordinates only (for map marker — not exact)
    approx_lat = Column(Float, nullable=True)
    approx_lng = Column(Float, nullable=True)
    exact_location = Column(Geometry("POINT", srid=4326), nullable=True)  # PostGIS — broker only

    # Goa-specific intelligence tags
    beach_distance_km = Column(Float, nullable=True)
    mopa_airport_km = Column(Float, nullable=True)
    dabolim_airport_km = Column(Float, nullable=True)
    tourist_density = Column(String(50), nullable=True)  # low/medium/high
    short_term_rental_potential = Column(Boolean, default=False)
    connectivity_score = Column(Integer, nullable=True)

    # Media — stored on Cloudinary
    images = relationship(
        "PropertyImage",
        back_populates="property",
        cascade="all, delete-orphan"
    )
    property_video_url = Column(String(500), nullable=True)
   
    # Amenities
    amenities = Column(JSON, default=list)  # ["parking", "pool", "gym", ...]

    # NRI flags
    nri_eligible = Column(Boolean, default=True)
    fema_compliant = Column(Boolean, default=True)

    # Meta
    is_featured = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    enquiries = relationship("Enquiry", back_populates="property", cascade="all, delete-orphan")
    documents = relationship("PropertyDocument", back_populates="property", cascade="all, delete-orphan")
    saved_by = relationship("SavedProperty", back_populates="property", cascade="all, delete-orphan")
    deals = relationship("Deal", back_populates="property", cascade="all, delete-orphan")


class Enquiry(Base):
    """
    Every buyer inquiry routes through the broker.
    No contact info is ever revealed until broker approves.
    """
    __tablename__ = "enquiries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # null if not registered

    # Buyer details (collected in form)
    buyer_name = Column(String(255), nullable=False)
    buyer_phone = Column(String(20), nullable=False)
    buyer_email = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    is_nri = Column(Boolean, default=False)
    budget = Column(Float, nullable=True)
    source = Column(String(50), default="website")  # website/whatsapp/referral

    # Lead management
    status = Column(SQLEnum(LeadStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), default=LeadStatus.new)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    broker_notes = Column(Text, nullable=True)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)
    address_revealed = Column(Boolean, default=False)  # broker explicitly unlocks

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    property = relationship("Property", back_populates="enquiries")
    user = relationship("User", back_populates="enquiries")


class SellerSubmission(Base):
    """
    'Get Free Valuation' form submissions from people
    who want your dad to sell/list their property.
    Every submission is a warm lead.
    """
    __tablename__ = "seller_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Seller details
    seller_name = Column(String(255), nullable=False)
    seller_phone = Column(String(20), nullable=False)
    seller_email = Column(String(255), nullable=True)

    # Property details submitted
    property_type = Column(SQLEnum(PropertyType, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), nullable=False)
    listing_type = Column(SQLEnum(ListingType, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), nullable=False)
    locality = Column(String(255), nullable=False)
    area_sqft = Column(Float, nullable=True)
    bedrooms = Column(Integer, nullable=True)
    asking_price = Column(
        Numeric(15, 2),
        nullable=True
    )
    description = Column(Text, nullable=True)
    submitted_photos = Column(JSON, default=list)  # cloudinary URLs

    # Documents submitted by seller
    documents = Column(JSON, default=list)  # 7/12, property card etc

    # Broker review
    status = Column(SQLEnum(SubmissionStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), default=SubmissionStatus.pending)
    broker_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    converted_property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="seller_submissions")


class Deal(Base):
    """
    Broker Deal Management.
    Tracks transactions from inquiry through completion with associated property,
    buyer, seller, status, and private document vault.
    """
    __tablename__ = "deals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_number = Column(String(50), unique=True, nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True, index=True)
    seller_name = Column(String(255), nullable=True)
    buyer_name = Column(String(255), nullable=True)
    status = Column(
        SQLEnum(DealStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30),
        default=DealStatus.inquiry,
        nullable=False,
        index=True,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    property = relationship("Property", back_populates="deals")
    documents = relationship("DealDocument", back_populates="deal", cascade="all, delete-orphan")


class DealDocument(Base):
    """
    Private Broker Deal Documents stored in authenticated Cloudinary storage.
    Strictly private - accessible only by the verified broker.
    """
    __tablename__ = "deal_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False, index=True)
    category = Column(
        SQLEnum(DocumentCategory, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    cloudinary_public_id = Column(String(500), nullable=False)
    resource_type = Column(String(50), nullable=False, default="raw")
    mime_type = Column(String(100), nullable=False, default="application/octet-stream")
    file_size = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    deal = relationship("Deal", back_populates="documents")


class PropertyDocument(Base):
    """
    Document vault — broker controls who sees what.
    Buyers only see docs after broker explicitly grants access.
    """
    __tablename__ = "property_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)

    name = Column(String(255), nullable=False)   # "7/12 Extract", "NOC", "Sale Agreement"
    doc_type = Column(String(100), nullable=False)
    file_url = Column(String(500), nullable=False)  # Cloudinary URL
    is_public = Column(Boolean, default=False)   # false = broker controls access
    allowed_user_ids = Column(JSON, default=list)  # list of user UUIDs broker has unlocked

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    property = relationship("Property", back_populates="documents")


class SavedProperty(Base):
    """
    Registered buyers save properties.
    Broker can see who is watching what — powerful lead intel.
    """
    __tablename__ = "saved_properties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="saved_properties")
    property = relationship("Property", back_populates="saved_by")



class PropertyImage(Base):
    __tablename__ = "property_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    property_id = Column(
        UUID(as_uuid=True),
        ForeignKey("properties.id"),
        nullable=False
    )

    image_url = Column(String(500), nullable=False)

    caption = Column(String(255), nullable=True)

    display_order = Column(Integer, default=1)

    is_thumbnail = Column(Boolean, default=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    property = relationship(
        "Property",
        back_populates="images"
    )

class Valuation(Base):
    """
    Private AI price estimations — ONLY visible to broker.
    Never exposed in any public API endpoint.
    """
    __tablename__ = "valuations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("seller_submissions.id"), nullable=True)

    # Inputs to model
    locality = Column(String(255), nullable=False)
    area_sqft = Column(Float, nullable=False)
    property_type = Column(SQLEnum(PropertyType, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), nullable=False)
    bedrooms = Column(Integer, nullable=True)
    age_years = Column(Integer, nullable=True)
    beach_distance_km = Column(Float, nullable=True)
    region = Column(SQLEnum(GoaRegion, values_callable=lambda x: [e.value for e in x], native_enum=False, length=30), nullable=False)

    # Model output
    estimated_low = Column(Numeric(15, 2))
    estimated_mid = Column(Numeric(15, 2))
    estimated_high = Column(Numeric(15, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BusinessProfile(Base):
    """
    Database-backed business profile and social media settings for Ashiyana Real Estate.
    Provides a single source of truth for the entire application.
    """
    __tablename__ = "business_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    broker_name = Column(String(255), nullable=False, default="Kassim Shaikh")
    broker_role = Column(String(255), nullable=False, default="Lead Broker & Founder")
    company_name = Column(String(255), nullable=False, default="Ashiyana Real Estate")
    phone = Column(String(50), nullable=False, default="+91 8888083558")
    whatsapp_number = Column(String(50), nullable=False, default="918888083558")
    email = Column(String(255), nullable=False, default="ashiyanarentbuysell@gmail.com")
    office_address = Column(String(500), nullable=False, default="Calangute & Panaji, Goa, India")

    # Social links — stored in PostgreSQL, only shown if configured
    facebook_url = Column(String(500), nullable=True)
    instagram_url = Column(String(500), nullable=True)
    olx_url = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
