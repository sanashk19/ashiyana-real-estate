"""add_deals_and_deal_documents

Revision ID: 5cc7de9fa012
Revises: 4bb6cd8fe441
Create Date: 2026-09-04 21:43:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5cc7de9fa012'
down_revision: Union[str, None] = '4bb6cd8fe441'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create deals table
    op.create_table(
        'deals',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('deal_number', sa.String(length=50), nullable=False),
        sa.Column('property_id', sa.UUID(), nullable=True),
        sa.Column('seller_name', sa.String(length=255), nullable=True),
        sa.Column('buyer_name', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='inquiry', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deals_deal_number'), 'deals', ['deal_number'], unique=True)
    op.create_index(op.f('ix_deals_property_id'), 'deals', ['property_id'], unique=False)
    op.create_index(op.f('ix_deals_status'), 'deals', ['status'], unique=False)

    # 2. Create deal_documents table
    op.create_table(
        'deal_documents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('deal_id', sa.UUID(), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('cloudinary_public_id', sa.String(length=500), nullable=False),
        sa.Column('resource_type', sa.String(length=50), server_default='raw', nullable=False),
        sa.Column('mime_type', sa.String(length=100), server_default='application/octet-stream', nullable=False),
        sa.Column('file_size', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deal_documents_deal_id'), 'deal_documents', ['deal_id'], unique=False)
    op.create_index(op.f('ix_deal_documents_category'), 'deal_documents', ['category'], unique=False)

    # 3. Drop obsolete seller_documents table if present
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'seller_documents' in tables:
        op.drop_table('seller_documents')


def downgrade() -> None:
    # 1. Drop deal_documents table
    op.drop_index(op.f('ix_deal_documents_category'), table_name='deal_documents')
    op.drop_index(op.f('ix_deal_documents_deal_id'), table_name='deal_documents')
    op.drop_table('deal_documents')

    # 2. Drop deals table
    op.drop_index(op.f('ix_deals_status'), table_name='deals')
    op.drop_index(op.f('ix_deals_property_id'), table_name='deals')
    op.drop_index(op.f('ix_deals_deal_number'), table_name='deals')
    op.drop_table('deals')

    # 3. Recreate seller_documents table
    op.create_table(
        'seller_documents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('submission_id', sa.UUID(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('doc_type', sa.String(length=100), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['submission_id'], ['seller_submissions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_seller_documents_user_id', 'seller_documents', ['user_id'], unique=False)
    op.create_index('ix_seller_documents_submission_id', 'seller_documents', ['submission_id'], unique=False)
