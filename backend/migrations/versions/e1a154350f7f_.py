"""empty message

Revision ID: e1a154350f7f
Revises: 05aa36351530
Create Date: 2025-04-07 19:18:01.454735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a154350f7f'
down_revision: Union[str, None] = '05aa36351530'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('activity_events',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('type', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('username', sa.String(), nullable=True),
    sa.Column('room_name', sa.String(), nullable=False),
    sa.Column('study_topic', sa.String(), nullable=True),
    sa.Column('timestamp', sa.DateTime(), nullable=False),
    sa.Column('expiry_time', sa.DateTime(), nullable=True),
    sa.Column('message', sa.Text(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_events_room_name'), 'activity_events', ['room_name'], unique=False)
    op.create_index(op.f('ix_activity_events_timestamp'), 'activity_events', ['timestamp'], unique=False)
    op.create_table('room_counts',
    sa.Column('room_name', sa.String(), nullable=False),
    sa.Column('occupant_count', sa.Integer(), nullable=False),
    sa.Column('last_updated', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('room_name')
    )
    op.create_table('room_occupancy',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.String(), nullable=False),
    sa.Column('room_name', sa.String(), nullable=False),
    sa.Column('study_topic', sa.String(), nullable=True),
    sa.Column('checkin_time', sa.DateTime(), nullable=False),
    sa.Column('expiry_time', sa.DateTime(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('username', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_room_occupancy_room_name'), 'room_occupancy', ['room_name'], unique=False)
    op.create_index(op.f('ix_room_occupancy_user_id'), 'room_occupancy', ['user_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_room_occupancy_user_id'), table_name='room_occupancy')
    op.drop_index(op.f('ix_room_occupancy_room_name'), table_name='room_occupancy')
    op.drop_table('room_occupancy')
    op.drop_table('room_counts')
    op.drop_index(op.f('ix_activity_events_timestamp'), table_name='activity_events')
    op.drop_index(op.f('ix_activity_events_room_name'), table_name='activity_events')
    op.drop_table('activity_events')
    # ### end Alembic commands ###
