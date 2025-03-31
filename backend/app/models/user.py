import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, UUID, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    username = Column(String, nullable=False)
    active = Column(Boolean, nullable=False, default=False)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id", ondelete="SET NULL"), nullable=True, index=True)

    cookies = relationship("Cookie", back_populates="user", cascade="all, delete-orphan")
    favorite_rooms = relationship("UserFavoriteRoom", back_populates="user", cascade="all, delete-orphan")
    program = relationship("Program", back_populates="users")

class Program(Base):
    __tablename__ = "programs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    users = relationship("User", back_populates="program")

class Cookie(Base):
    __tablename__ = "cookies"

    access_token = Column(String, primary_key=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="cookies")
