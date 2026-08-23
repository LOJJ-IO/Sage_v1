"""add personal folders

Revision ID: 1e955fc30f05
Revises: 5db799a56660
Create Date: 2026-08-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1e955fc30f05'
down_revision: Union[str, Sequence[str], None] = '5db799a56660'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('user_personal_folders',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('folder_name', sa.String(length=255), nullable=False),
    sa.Column('parent_folder_id', sa.UUID(), nullable=True),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['parent_folder_id'], ['user_personal_folders.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_personal_folders_business_id'), 'user_personal_folders', ['business_id'], unique=False)
    op.create_index(op.f('ix_user_personal_folders_user_id'), 'user_personal_folders', ['user_id'], unique=False)

    op.create_table('user_personal_folder_items',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('business_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('folder_id', sa.UUID(), nullable=True),
    sa.Column('file_id', sa.String(length=512), nullable=False),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['folder_id'], ['user_personal_folders.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'file_id', name='uq_personal_folder_items_user_file')
    )
    op.create_index(op.f('ix_user_personal_folder_items_business_id'), 'user_personal_folder_items', ['business_id'], unique=False)
    op.create_index(op.f('ix_user_personal_folder_items_user_id'), 'user_personal_folder_items', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_user_personal_folder_items_user_id'), table_name='user_personal_folder_items')
    op.drop_index(op.f('ix_user_personal_folder_items_business_id'), table_name='user_personal_folder_items')
    op.drop_table('user_personal_folder_items')

    op.drop_index(op.f('ix_user_personal_folders_user_id'), table_name='user_personal_folders')
    op.drop_index(op.f('ix_user_personal_folders_business_id'), table_name='user_personal_folders')
    op.drop_table('user_personal_folders')
