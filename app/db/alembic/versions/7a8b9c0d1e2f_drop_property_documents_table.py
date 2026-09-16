"""drop_property_documents_table

Revision ID: 7a8b9c0d1e2f
Revises: 6f1b2c3d4e5f
Create Date: 2026-09-05 08:40:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, None] = '6f1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop obsolete property_documents table
    op.drop_table('property_documents')


def downgrade() -> None:
    # Recreate property_documents table if needed on rollback
    op.create_table(
        'property_documents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('property_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('doc_type', sa.String(length=100), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=True),
        sa.Column('allowed_user_ids', sa.JSON(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id']),
        sa.PrimaryKeyConstraint('id')
    )
