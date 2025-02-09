from sqlalchemy.orm import Session
from app.models.user import User
from app.utils.query import filter_query

def get_user_by_email(db: Session, email: str):
    result = filter_query(db, model=User, filters=[User.email == email])
    return result[0] if result else None

def get_user_by_username(db: Session, username: str):
    result = filter_query(db, model=User, filters=[User.username == username])
    return result[0] if result else None

def get_user_by_id(db: Session, user_id: int):
    result = filter_query(db, model=User, filters=[User.id == user_id])
    return result[0] if result else None
