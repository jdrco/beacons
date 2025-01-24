import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Boolean, DateTime, UUID, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True)
    lname = Column(String, nullable=False)
    fname = Column(String, nullable=False)
    active = Column(Boolean, nullable=False)
    share_profile = Column(Boolean, nullable=False)
    education_level = Column(String, nullable=True)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="sessions")
