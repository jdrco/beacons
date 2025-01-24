from uuid import uuid4, UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.user import Session as SessionModel
from app.utils.query import query

def get_user_by_email(db: Session, email: str):
    """
    Retrieve a user by email.
    """
    result = query(db, model=User, filters=[User.email == email])
    return result[0] if result else None

def get_user_by_id(db: Session, user_id: int):
    """
    Retrieve a user by ID.
    """
    result = query(db, model=User, filters=[User.id == user_id])
    return result[0] if result else None


def create_user(db: Session, email: str, fname: str, lname: str):
    """
    Create a new user.
    """
    new_user = User(
        email=email,
        fname=fname,
        lname=lname,
        active=True,
        share_profile=False,
        education_level=None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def create_session(db: Session, user_id: str, duration_days: int = 1):
    """
    Create a new session.
    """
    session = SessionModel(
        id=str(uuid4()),
        user_id=user_id,
        created_at=datetime.now(),
        expires_at=datetime.now() + timedelta(days=duration_days),
        is_active=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def get_active_session(db: Session, session_id: str = None, user_id: UUID = None):
    """
    Retrieve an active session by session ID or user ID.
    """
    filters = [SessionModel.is_active == True, SessionModel.expires_at > datetime.now()]
    
    if session_id:
        filters.append(SessionModel.id == session_id)
    if user_id:
        filters.append(SessionModel.user_id == user_id)
    
    result = query(db, model=SessionModel, filters=filters)
    return result[0] if result else None

def deactivate_session(db: Session, session_id: str):
    """
    Deactivate a session by session ID.
    """
    session = get_active_session(db, session_id=session_id)
    if session:
        session.is_active = False
        db.commit()
        db.refresh(session)
    return session

def update_user(db: Session, user_id: int, user_update):
    """
    Update a user.
    """
    