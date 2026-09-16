"""add_deal_parties_and_upload_requests

Revision ID: 8b9c0d1e2f3a
Revises: 7a8b9c0d1e2f
Create Date: 2026-09-07 22:30:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8b9c0d1e2f3a'
down_revision: Union[str, None] = '7a8b9c0d1e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add structured party fields to deals table
    op.add_column('deals', sa.Column('buyer_phone', sa.String(length=50), nullable=True))
    op.add_column('deals', sa.Column('buyer_email', sa.String(length=255), nullable=True))
    op.add_column('deals', sa.Column('buyer_address', sa.Text(), nullable=True))
    op.add_column('deals', sa.Column('buyer_notes', sa.Text(), nullable=True))

    op.add_column('deals', sa.Column('seller_phone', sa.String(length=50), nullable=True))
    op.add_column('deals', sa.Column('seller_email', sa.String(length=255), nullable=True))
    op.add_column('deals', sa.Column('seller_address', sa.Text(), nullable=True))
    op.add_column('deals', sa.Column('seller_notes', sa.Text(), nullable=True))

    # 2. Add verification & metadata fields to deal_documents table
    op.add_column('deal_documents', sa.Column('party', sa.String(length=20), nullable=True))
    op.add_column('deal_documents', sa.Column('document_side', sa.String(length=20), nullable=True))
    op.add_column('deal_documents', sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('deal_documents', sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('deal_documents', sa.Column('verified_by', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_deal_documents_verified_by_users',
        'deal_documents', 'users',
        ['verified_by'], ['id'],
        ondelete='SET NULL'
    )

    # 3. Create deal_upload_requests table
    op.create_table(
        'deal_upload_requests',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('deal_id', sa.UUID(), nullable=False),
        sa.Column('party', sa.String(length=20), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('requested_by', sa.UUID(), nullable=False),
        sa.Column('requested_docs', sa.Text(), server_default='[]', nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deal_upload_requests_deal_id'), 'deal_upload_requests', ['deal_id'], unique=False)
    op.create_index(op.f('ix_deal_upload_requests_token_hash'), 'deal_upload_requests', ['token_hash'], unique=True)
    op.create_index(op.f('ix_deal_upload_requests_expires_at'), 'deal_upload_requests', ['expires_at'], unique=False)
    op.create_index(op.f('ix_deal_upload_requests_is_revoked'), 'deal_upload_requests', ['is_revoked'], unique=False)


def downgrade() -> None:
    # 1. Drop deal_upload_requests table
    op.drop_index(op.f('ix_deal_upload_requests_is_revoked'), table_name='deal_upload_requests')
    op.drop_index(op.f('ix_deal_upload_requests_expires_at'), table_name='deal_upload_requests')
    op.drop_index(op.f('ix_deal_upload_requests_token_hash'), table_name='deal_upload_requests')
    op.drop_index(op.f('ix_deal_upload_requests_deal_id'), table_name='deal_upload_requests')
    op.drop_table('deal_upload_requests')

    # 2. Drop deal_documents added columns
    op.drop_constraint('fk_deal_documents_verified_by_users', 'deal_documents', type_='foreignkey')
    op.drop_column('deal_documents', 'verified_by')
    op.drop_column('deal_documents', 'verified_at')
    op.drop_column('deal_documents', 'is_verified')
    op.drop_column('deal_documents', 'document_side')
    op.drop_column('deal_documents', 'party')

    # 3. Drop deals added columns
    op.drop_column('deals', 'seller_notes')
    op.drop_column('deals', 'seller_address')
    op.drop_column('deals', 'seller_email')
    op.drop_column('deals', 'seller_phone')
    op.drop_column('deals', 'buyer_notes')
    op.drop_column('deals', 'buyer_address')
    op.drop_column('deals', 'buyer_email')
    op.drop_column('deals', 'buyer_phone')
