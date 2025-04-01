from uuid import UUID

from fastapi import Depends
from fastapi.routing import APIRouter
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.query import filter_query
from app.utils.response import success_response, error_response
from app.core.auth import get_active_user
from app.models.user import User
from app.models.building import Room, UserFavoriteRoom
from app.schemas.user import UserUpdate
from app.schemas.building import AddFavoriteRooms

router = APIRouter()

@router.get("/user/details")
def get_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    user_data = {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "active": current_user.active,
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

        db.query(User).filter(User.id == user_data.user_id).update(update_data, synchronize_session=False)
        db.commit()
        return success_response(200, True, "User updated")
    except Exception as e:
        return error_response(500, False, str(e))

@router.delete("/user/delete")
def delete_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    user_id = current_user.id

    user = filter_query(db, model=User, filters=[User.id == user_id])
    if not user:
        return error_response(404, False, "User not found")

    try:
        db.query(User).filter(User.id == user_id).delete()
        db.commit()
        return success_response(200, True, "User deleted")
    except Exception as e:
        return error_response(500, False, str(e))

@router.get("/user/list_favorite_rooms")
def get_favorite_rooms(
    page: int = 1,
    per_page: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    try:
        total_count = (
            db.query(Room)
            .join(UserFavoriteRoom)
            .filter(UserFavoriteRoom.user_id == current_user.id)
            .count()
        )

        favorite_rooms = filter_query(
            db,
            model=Room,
            join_models=[UserFavoriteRoom],
            filters=[UserFavoriteRoom.user_id == current_user.id],
            limit=per_page,
            offset=(page - 1) * per_page
        )

        favorite_rooms_data = [room.name for room in favorite_rooms]

        pagination = {
            "total": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": (total_count + per_page - 1) // per_page
        }

        return success_response(
            200,
            True,
            "Favorite rooms found",
            data=favorite_rooms_data,
            pagination=pagination
        )

    except Exception as e:
        return error_response(
            500,
            False,
            str(e)
        )

@router.put("/user/add_multiple_favorite_rooms")
def add_multiple_favorite_rooms(
    request: AddFavoriteRooms,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    try:
        db.query(UserFavoriteRoom).filter(
            UserFavoriteRoom.user_id == current_user.id
        ).delete()

        valid_rooms = db.query(Room).filter(Room.name.in_(request.room_names)).all()
        valid_room_ids = {room.id for room in valid_rooms}

        new_favorites = [
            UserFavoriteRoom(user_id=current_user.id, room_id=room_id)
            for room_id in valid_room_ids
        ]

        db.add_all(new_favorites)
        db.commit()

        return success_response(
            200,
            True,
            "Favorite rooms updated successfully"
        )

    except Exception as e:
        db.rollback()
        return error_response(
            500,
            False,
            str(e)
        )

@router.put("/user/add_favorite_room")
def add_favorite_room(
    room_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    try:
        room = db.query(Room).filter(Room.name == room_name).first()
        if not room:
            return error_response(404, False, "Room not found")

        existing_favorite = db.query(UserFavoriteRoom).filter(
            UserFavoriteRoom.user_id == current_user.id,
            UserFavoriteRoom.room_id == room.id
        ).first()

        if existing_favorite:
            return error_response(409, False, "Room already favorited")

        favorite = UserFavoriteRoom(user_id=current_user.id, room_id=room.id)
        db.add(favorite)
        db.commit()

        return success_response(
            200,
            True,
            "Room favorited successfully"
        )
    except Exception as e:
        db.rollback()
        return error_response(
            500,
            False,
            str(e)
        )

@router.delete("/user/remove_favorite_room")
def remove_favorite_room(
    room_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    try:
        room = db.query(Room).filter(Room.name == room_name).first()
        if not room:
            return error_response(404, False, "Room not found")

        deleted_count = db.query(UserFavoriteRoom).filter(
            UserFavoriteRoom.user_id == current_user.id,
            UserFavoriteRoom.room_id == room.id
        ).delete(synchronize_session="fetch")

        if deleted_count == 0:
            return error_response(
                404,
                False,
                "Room not favorited or does not exist"
            )

        db.commit()
        return success_response(
            200,
            True,
            "Room removed from favorites successfully"
        )
    except Exception as e:
        db.rollback()
        return error_response(
            500,
            False,
            str(e)
        )
