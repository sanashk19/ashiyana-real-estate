from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import List, Tuple

from app.models.models import Property, PropertyStatus, SavedProperty, PropertyImage, User
from app.schemas.properties import (
    PropertyCreate,
    PropertyUpdate,
    PropertyFilters,
    PropertyImageCreate,
    PropertyImageReorderItem,
)


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
        from sqlalchemy import update
        new_count = (prop.view_count or 0) + 1
        prop.view_count = new_count
        await db.execute(
            update(Property)
            .where(Property.id == prop.id)
            .values(view_count=new_count)
            .execution_options(synchronize_session=False)
        )

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
            q = filters.locality.strip()
            conditions.append(
                or_(
                    Property.title.ilike(f"%{q}%"),
                    Property.locality.ilike(f"%{q}%"),
                    Property.village.ilike(f"%{q}%"),
                    Property.taluka.ilike(f"%{q}%"),
                )
            )
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
            select(SavedProperty, User)
            .join(User, SavedProperty.user_id == User.id)
            .where(SavedProperty.property_id == property_id)
            .order_by(SavedProperty.saved_at.desc())
        )
        rows = result.all()
        return [
            {
                "user_id": sp.user_id,
                "saved_at": sp.saved_at,
                "buyer_name": user.full_name,
                "buyer_email": user.email,
                "buyer_phone": user.phone,
                "is_nri": user.is_nri,
            }
            for sp, user in rows
        ]

    @staticmethod
    async def add_images(
        db: AsyncSession,
        property_id: UUID,
        image_data_list: List[PropertyImageCreate],
    ) -> List[PropertyImage]:
        """
        Add multiple images to a property.
        Sets display_order sequentially and sets first image as thumbnail if none exists.
        """
        existing_result = await db.execute(
            select(PropertyImage)
            .where(PropertyImage.property_id == property_id)
            .order_by(PropertyImage.display_order.asc())
        )
        existing_images = existing_result.scalars().all()
        has_thumbnail = any(img.is_thumbnail for img in existing_images)
        current_max_order = max([img.display_order or 0 for img in existing_images], default=0)

        created_images: List[PropertyImage] = []
        for i, img_data in enumerate(image_data_list):
            order = img_data.display_order if img_data.display_order is not None else (current_max_order + i + 1)
            is_thumb = img_data.is_thumbnail or (not has_thumbnail and i == 0)
            if is_thumb:
                has_thumbnail = True

            new_img = PropertyImage(
                property_id=property_id,
                image_url=img_data.image_url,
                caption=img_data.caption,
                display_order=order,
                is_thumbnail=is_thumb,
            )
            db.add(new_img)
            created_images.append(new_img)

        await db.flush()
        return created_images

    @staticmethod
    async def get_images(
        db: AsyncSession, property_id: UUID
    ) -> List[PropertyImage]:
        result = await db.execute(
            select(PropertyImage)
            .where(PropertyImage.property_id == property_id)
            .order_by(PropertyImage.display_order.asc(), PropertyImage.created_at.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def delete_image(
        db: AsyncSession, property_id: UUID, image_id: UUID
    ) -> bool:
        result = await db.execute(
            select(PropertyImage).where(
                PropertyImage.id == image_id,
                PropertyImage.property_id == property_id,
            )
        )
        img = result.scalar_one_or_none()
        if not img:
            return False

        was_thumbnail = img.is_thumbnail
        await db.delete(img)
        await db.flush()

        # If deleted image was the thumbnail, make the first remaining image thumbnail
        if was_thumbnail:
            remaining_result = await db.execute(
                select(PropertyImage)
                .where(PropertyImage.property_id == property_id)
                .order_by(PropertyImage.display_order.asc())
            )
            remaining_images = remaining_result.scalars().all()
            if remaining_images:
                remaining_images[0].is_thumbnail = True
                await db.flush()

        return True

    @staticmethod
    async def reorder_images(
        db: AsyncSession,
        property_id: UUID,
        items: List[PropertyImageReorderItem],
    ) -> List[PropertyImage]:
        for item in items:
            result = await db.execute(
                select(PropertyImage).where(
                    PropertyImage.id == item.image_id,
                    PropertyImage.property_id == property_id,
                )
            )
            img = result.scalar_one_or_none()
            if img:
                img.display_order = item.display_order

        await db.flush()
        return await PropertyService.get_images(db, property_id)

    @staticmethod
    async def set_thumbnail(
        db: AsyncSession, property_id: UUID, image_id: UUID
    ) -> PropertyImage | None:
        images_result = await db.execute(
            select(PropertyImage).where(PropertyImage.property_id == property_id)
        )
        images = images_result.scalars().all()
        target_img = None
        for img in images:
            if img.id == image_id:
                img.is_thumbnail = True
                target_img = img
            else:
                img.is_thumbnail = False

        if target_img:
            await db.flush()
        return target_img

