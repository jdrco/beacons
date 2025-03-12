import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, UUID, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models import *

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    username = Column(String, nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    share_profile = Column(Boolean, nullable=False, default=True)
    education_level = Column(String, nullable=True)

    latitude = Column(DECIMAL(9, 6), nullable=True)
    longitude = Column(DECIMAL(9, 6), nullable=True)
    
    cookies = relationship("Cookie", back_populates="user", cascade="all, delete-orphan")
    favorite_rooms = relationship("UserFavoriteRoom", back_populates="user", cascade="all, delete-orphan")

class Cookie(Base):
    __tablename__ = "cookies"

    access_token = Column(String, primary_key=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="cookies")

class UserFavoriteRoom(Base):
    __tablename__ = "user_favorite_rooms"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True, nullable=False)

    user = relationship("User", back_populates="favorite_rooms")
    room = relationship("Room", back_populates="favorited_by")
