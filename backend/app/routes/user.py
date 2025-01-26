from sqlalchemy.orm import Session

def update_user(db: Session, user_id: int, user_update):
    """
    Update a user.
    """
    return None