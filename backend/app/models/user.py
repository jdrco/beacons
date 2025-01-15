from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base
from uuid import uuid4

class User(Base):
    __tablename__ = "users"

    id = Column(uuid4, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    lname = Column(String)
    fname = Column(String)
    active = Column(Boolean, default=True)
    program = Column(String)
    share_profile = Column(Boolean, default=False)
    