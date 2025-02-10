import uuid
from sqlalchemy import Column, String, UUID, DECIMAL, ForeignKey, DateTime, Boolean, Index, Time
from sqlalchemy.orm import relationship
from app.core.database import Base

class Building(Base):
    __tablename__ = "buildings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    latitude = Column(DECIMAL(9, 6), nullable=False)
    longitude = Column(DECIMAL(9, 6), nullable=False)

    rooms = relationship("Room", back_populates="building", cascade="all, delete")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)

    building = relationship("Building", back_populates="rooms")
    room_schedules = relationship("RoomSchedule", back_populates="room", cascade="all, delete")
    single_event_schedules = relationship("SingleEventSchedule", back_populates="room", cascade="all, delete")


class RoomSchedule(Base):
    __tablename__ = "room_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(Time, nullable=False, index=True)
    end_time = Column(Time, nullable=False, index=True)
    day = Column(String, nullable=False, index=True)
    occupied = Column(Boolean, nullable=False, default=False)
    course = Column(String, nullable=True)

    room = relationship("Room", back_populates="room_schedules")

    __table_args__ = (
        Index("idx_room_schedules_day", "room_id", "day"),
        Index("idx_room_schedules_start_time", "room_id", "start_time"),
    )

class SingleEventSchedule(Base):
    __tablename__ = "single_event_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    course = Column(String, nullable=True)

    room = relationship("Room", back_populates="single_event_schedules")

    __table_args__ = (
        Index("idx_single_event_start_time", "room_id", "start_time"),
    )
