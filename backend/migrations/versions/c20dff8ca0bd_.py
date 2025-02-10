"""empty message

Revision ID: c20dff8ca0bd
Revises: 
Create Date: 2025-02-10 01:22:47.170131

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c20dff8ca0bd'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('buildings',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('latitude', sa.DECIMAL(precision=9, scale=6), nullable=False),
    sa.Column('longitude', sa.DECIMAL(precision=9, scale=6), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_buildings_id'), 'buildings', ['id'], unique=False)
    op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('password', sa.String(), nullable=False),
    sa.Column('username', sa.String(), nullable=False),
    sa.Column('active', sa.Boolean(), nullable=False),
    sa.Column('share_profile', sa.Boolean(), nullable=False),
    sa.Column('education_level', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_table('cookies',
    sa.Column('access_token', sa.String(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('access_token')
    )
    op.create_index(op.f('ix_cookies_user_id'), 'cookies', ['user_id'], unique=False)
    op.create_table('rooms',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('building_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.ForeignKeyConstraint(['building_id'], ['buildings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rooms_building_id'), 'rooms', ['building_id'], unique=False)
    op.create_index(op.f('ix_rooms_id'), 'rooms', ['id'], unique=False)
    op.create_table('room_schedules',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('room_id', sa.UUID(), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.Column('day', sa.String(), nullable=False),
    sa.Column('occupied', sa.Boolean(), nullable=False),
    sa.Column('course', sa.String(), nullable=True),
    sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_room_schedules_day', 'room_schedules', ['room_id', 'day'], unique=False)
    op.create_index('idx_room_schedules_start_time', 'room_schedules', ['room_id', 'start_time'], unique=False)
    op.create_index(op.f('ix_room_schedules_day'), 'room_schedules', ['day'], unique=False)
    op.create_index(op.f('ix_room_schedules_end_time'), 'room_schedules', ['end_time'], unique=False)
    op.create_index(op.f('ix_room_schedules_id'), 'room_schedules', ['id'], unique=False)
    op.create_index(op.f('ix_room_schedules_room_id'), 'room_schedules', ['room_id'], unique=False)
    op.create_index(op.f('ix_room_schedules_start_time'), 'room_schedules', ['start_time'], unique=False)
    op.create_table('single_event_schedules',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('room_id', sa.UUID(), nullable=False),
    sa.Column('start_time', sa.DateTime(), nullable=False),
    sa.Column('end_time', sa.DateTime(), nullable=False),
    sa.Column('course', sa.String(), nullable=True),
    sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_single_event_start_time', 'single_event_schedules', ['room_id', 'start_time'], unique=False)
    op.create_index(op.f('ix_single_event_schedules_end_time'), 'single_event_schedules', ['end_time'], unique=False)
    op.create_index(op.f('ix_single_event_schedules_id'), 'single_event_schedules', ['id'], unique=False)
    op.create_index(op.f('ix_single_event_schedules_room_id'), 'single_event_schedules', ['room_id'], unique=False)
    op.create_index(op.f('ix_single_event_schedules_start_time'), 'single_event_schedules', ['start_time'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_single_event_schedules_start_time'), table_name='single_event_schedules')
    op.drop_index(op.f('ix_single_event_schedules_room_id'), table_name='single_event_schedules')
    op.drop_index(op.f('ix_single_event_schedules_id'), table_name='single_event_schedules')
    op.drop_index(op.f('ix_single_event_schedules_end_time'), table_name='single_event_schedules')
    op.drop_index('idx_single_event_start_time', table_name='single_event_schedules')
    op.drop_table('single_event_schedules')
    op.drop_index(op.f('ix_room_schedules_start_time'), table_name='room_schedules')
    op.drop_index(op.f('ix_room_schedules_room_id'), table_name='room_schedules')
    op.drop_index(op.f('ix_room_schedules_id'), table_name='room_schedules')
    op.drop_index(op.f('ix_room_schedules_end_time'), table_name='room_schedules')
    op.drop_index(op.f('ix_room_schedules_day'), table_name='room_schedules')
    op.drop_index('idx_room_schedules_start_time', table_name='room_schedules')
    op.drop_index('idx_room_schedules_day', table_name='room_schedules')
    op.drop_table('room_schedules')
    op.drop_index(op.f('ix_rooms_id'), table_name='rooms')
    op.drop_index(op.f('ix_rooms_building_id'), table_name='rooms')
    op.drop_table('rooms')
    op.drop_index(op.f('ix_cookies_user_id'), table_name='cookies')
    op.drop_table('cookies')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_buildings_id'), table_name='buildings')
    op.drop_table('buildings')
    # ### end Alembic commands ###
