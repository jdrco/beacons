"""Add user location columns

Revision ID: fbbca3b8d1c9
Revises: c5d52df44352
Create Date: 2025-03-12 09:26:17.270790

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fbbca3b8d1c9'
down_revision: Union[str, None] = 'c5d52df44352'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('latitude', sa.DECIMAL(9, 6), nullable=True))
    op.add_column('users', sa.Column('longitude', sa.DECIMAL(9, 6), nullable=True))


def downgrade() -> None:
    pass
