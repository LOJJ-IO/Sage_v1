"""add files.preview_markdown

Revision ID: 5db799a56660
Revises: 6585925541ad
Create Date: 2026-08-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5db799a56660'
down_revision: Union[str, Sequence[str], None] = '6585925541ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('files', sa.Column('preview_markdown', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('files', 'preview_markdown')
