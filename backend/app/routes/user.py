from uuid import UUID

from fastapi import Depends
from fastapi.routing import APIRouter
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.query import filter_query
from app.utils.response import success_response, error_response
from app.core.auth import get_active_user
from app.models.user import User
from app.schemas.user import UserUpdate

router = APIRouter()

@router.get("/user/{user_id}")
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)):

    user = filter_query(db, model=User, filters=[User.id == user_id])
    if not user:
        return error_response(404, False, "User not found")

    if current_user.id != user[0].id:
        return error_response(403, False, "Unauthorized. You can only view your own profile.")

    user_data = {
        "id": str(user[0].id),
        "email": user[0].email,
        "username": user[0].username,
        "active": user[0].active,
        "share_profile": user[0].share_profile,
        "education_level": user[0].education_level
    }

    return success_response(200, True, "User found", data=user_data)

@router.put("/user/update")
def update_user(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)):

    user = filter_query(db, model=User, filters=[User.id == user_data.user_id])
    if not user:
        return error_response(404, False, "User not found")
    if current_user.id != user[0].id:
        return error_response(403, False, "Unauthorized. You can only update your own profile.")

    try:
        update_data = {}
        if user_data.username:
            update_data["username"] = user_data.username
        if user_data.active is not None:
            update_data["active"] = user_data.active
        if user_data.share_profile is not None:
            update_data["share_profile"] = user_data.share_profile
        if user_data.education_level:
            update_data["education_level"] = user_data.education_level

        db.query(User).filter(User.id == user_data.user_id).update(update_data, synchronize_session=False)
        db.commit()
        return success_response(200, True, "User updated")
    except Exception as e:
        return error_response(400, False, str(e))


@router.delete("/user/delete")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)):

    user = filter_query(db, model=User, filters=[User.id == user_id])
    if not user:
        return error_response(404, False, "User not found")
    if current_user.id != user[0].id:
        return error_response(403, False, "Unauthorized. You can only delete your own profile.")

    try:
        db.query(User).filter(User.id == user_id).delete()
        db.commit()
        return success_response(200, True, "User deleted")
    except Exception as e:
        return error_response(400, False, str(e))
