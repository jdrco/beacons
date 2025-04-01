"""empty message

Revision ID: 05aa36351530
Revises: 798887e7d229
Create Date: 2025-04-01 15:26:19.672895

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '05aa36351530'
down_revision: Union[str, None] = '798887e7d229'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('user_favorite_rooms', sa.Column('notification_sent', sa.Boolean(), nullable=False))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('user_favorite_rooms', 'notification_sent')
    # ### end Alembic commands ###
