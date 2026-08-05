"""add chat_settings

Revision ID: 6585925541ad
Revises: 327e0067e67e
Create Date: 2026-08-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6585925541ad'
down_revision: Union[str, Sequence[str], None] = '327e0067e67e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('chat_settings',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('goal', sa.String(length=16), nullable=False),
    sa.Column('response_length', sa.String(length=16), nullable=False),
    sa.Column('custom_instructions', sa.Text(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_index(op.f('ix_chat_settings_business_id'), 'chat_settings', ['business_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('chat_settings')
