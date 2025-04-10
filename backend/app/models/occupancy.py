import uuid
from datetime import datetime
from sqlalchemy import Column, String, UUID, Integer, DateTime, Boolean, Text

from app.core.database import Base

class RoomOccupancy(Base):
    """
    Tracks real-time room occupancy and user check-ins
    """
    __tablename__ = "room_occupancy"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Use String type for user_id from WebSockets
    user_id = Column(String, nullable=False, index=True)
    room_name = Column(String, nullable=False, index=True)  # Using room_name instead of ID as frontend knows room name
    study_topic = Column(String, nullable=True)
    checkin_time = Column(DateTime, nullable=False, default=datetime.now)
    expiry_time = Column(DateTime, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    username = Column(String, nullable=True)

class RoomCount(Base):
    """
    Maintains real-time count of occupants per room
    """
    __tablename__ = "room_counts"
    
    room_name = Column(String, primary_key=True)
    occupant_count = Column(Integer, nullable=False, default=0)
    last_updated = Column(DateTime, nullable=False, default=datetime.now)

class ActivityEvent(Base):
    """
    Stores check-in/check-out events permanently in the database
    Only for actual check-in/check-out events, not connections
    """
    __tablename__ = "activity_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, nullable=False)  # Only "checkin" or "checkout"
    user_id = Column(String, nullable=False)
    username = Column(String, nullable=True)
    room_name = Column(String, nullable=False, index=True)
    study_topic = Column(String, nullable=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.now, index=True)
    expiry_time = Column(DateTime, nullable=True)
    message = Column(Text, nullable=False)