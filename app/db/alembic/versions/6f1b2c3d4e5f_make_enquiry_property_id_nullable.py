"""make_enquiry_property_id_nullable

Revision ID: 6f1b2c3d4e5f
Revises: 5cc7de9fa012
Create Date: 2026-09-04 23:05:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f1b2c3d4e5f'
down_revision: Union[str, None] = '5cc7de9fa012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'enquiries',
        'property_id',
        existing_type=sa.UUID(),
        nullable=True
    )


def downgrade() -> None:
    op.alter_column(
        'enquiries',
        'property_id',
        existing_type=sa.UUID(),
        nullable=False
    )
