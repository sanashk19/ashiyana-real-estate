from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from uuid import UUID
from typing import List, Tuple

from app.models.models import Property, PropertyStatus, SavedProperty
from app.schemas.properties import PropertyCreate, PropertyUpdate, PropertyFilters


class PropertyService:

    @staticmethod
    async def create(
        db: AsyncSession,
        data: PropertyCreate,
        broker_id: UUID,
    ) -> Property:
        prop = Property(
            **data.model_dump(exclude={"exact_lat", "exact_lng"}),
            created_by=broker_id,
        )
        # Store exact PostGIS point if coordinates provided (broker-only field)
        if data.exact_lat and data.exact_lng:
            prop.exact_location = f"SRID=4326;POINT({data.exact_lng} {data.exact_lat})"

        db.add(prop)
        await db.flush()
        return prop

    

    @staticmethod
    async def get_by_id(db: AsyncSession, property_id: UUID) -> Property | None:
        result = await db.execute(
            select(Property)
            .options(selectinload(Property.images))
            .where(Property.id == property_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update(
        db: AsyncSession,
        prop: Property,
        data: PropertyUpdate,
    ) -> Property:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(prop, key, value)
        await db.flush()
        return prop

    @staticmethod
    async def delete(db: AsyncSession, prop: Property) -> None:
        await db.delete(prop)

    @staticmethod
    async def increment_view(db: AsyncSession, prop: Property) -> None:
        prop.view_count = (prop.view_count or 0) + 1
        await db.flush()

    @staticmethod
    async def search(
        db: AsyncSession,
        filters: PropertyFilters,
    ) -> Tuple[List[Property], int]:
        """
        Returns (properties, total_count) for pagination.
        Only returns active listings to the public.
        """
        conditions = []

        if filters.status:
            conditions.append(Property.status == filters.status)
        if filters.property_type:
            conditions.append(Property.property_type == filters.property_type)
        if filters.listing_type:
            conditions.append(Property.listing_type == filters.listing_type)
        if filters.region:
            conditions.append(Property.region == filters.region)
        if filters.locality:
            conditions.append(Property.locality.ilike(f"%{filters.locality}%"))
        if filters.min_price is not None:
            conditions.append(Property.price >= filters.min_price)
        if filters.max_price is not None:
            conditions.append(Property.price <= filters.max_price)
        if filters.bedrooms is not None:
            conditions.append(Property.bedrooms == filters.bedrooms)
        if filters.furnished:
            conditions.append(Property.furnished == filters.furnished)
        if filters.nri_eligible is not None:
            conditions.append(Property.nri_eligible == filters.nri_eligible)
        if filters.short_term_rental_potential is not None:
            conditions.append(
                Property.short_term_rental_potential == filters.short_term_rental_potential
            )
        
        if filters.is_featured is not None:
            conditions.append(Property.is_featured == filters.is_featured)

        base_query = select(Property).where(and_(*conditions)) if conditions else select(Property)

        # Total count for pagination
        count_result = await db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total = count_result.scalar_one()

        # Paginated results — featured listings first, then newest
        result = await db.execute(
            base_query
            .options(selectinload(Property.images))
            .order_by(Property.is_featured.desc(), Property.created_at.desc())
            .offset(filters.skip)
            .limit(filters.limit)
        )
        properties = result.scalars().all()

        return properties, total

    @staticmethod
    async def save_property(
        db: AsyncSession, user_id: UUID, property_id: UUID
    ) -> bool:
        """Returns True if saved, False if already saved (idempotent)."""
        existing = await db.execute(
            select(SavedProperty).where(
                SavedProperty.user_id == user_id,
                SavedProperty.property_id == property_id,
            )
        )
        if existing.scalar_one_or_none():
            return False

        saved = SavedProperty(user_id=user_id, property_id=property_id)
        db.add(saved)
        await db.flush()
        return True

    @staticmethod
    async def unsave_property(
        db: AsyncSession, user_id: UUID, property_id: UUID
    ) -> bool:
        result = await db.execute(
            select(SavedProperty).where(
                SavedProperty.user_id == user_id,
                SavedProperty.property_id == property_id,
            )
        )
        saved = result.scalar_one_or_none()
        if not saved:
            return False
        await db.delete(saved)
        return True

    @staticmethod
    async def get_saved_by_user(
        db: AsyncSession, user_id: UUID
    ) -> List[Property]:
        result = await db.execute(
            select(Property)
            .join(SavedProperty, SavedProperty.property_id == Property.id)
            .where(SavedProperty.user_id == user_id)
            .order_by(SavedProperty.saved_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_watchers(
        db: AsyncSession, property_id: UUID
    ) -> List[dict]:
        """
        Broker-only: see which registered users saved this property.
        Lead intelligence — who is watching what.
        """
        result = await db.execute(
            select(SavedProperty)
            .where(SavedProperty.property_id == property_id)
            .order_by(SavedProperty.saved_at.desc())
        )
        return result.scalars().all()
