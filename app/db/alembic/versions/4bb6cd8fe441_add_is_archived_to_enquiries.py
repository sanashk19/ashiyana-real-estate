"""add_is_archived_to_enquiries

Revision ID: 4bb6cd8fe441
Revises: e747d27c2e36
Create Date: 2026-09-02 09:05:21.643284

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision: str = '4bb6cd8fe441'
down_revision: Union[str, None] = 'e747d27c2e36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'enquiries',
        sa.Column('is_archived', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )
    op.create_index(op.f('ix_enquiries_is_archived'), 'enquiries', ['is_archived'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_enquiries_is_archived'), table_name='enquiries')
    op.drop_column('enquiries', 'is_archived')