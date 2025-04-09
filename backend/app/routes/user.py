from math import radians, sin, cos, sqrt, atan2

from fastapi import Depends
from fastapi.routing import APIRouter
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.query import filter_query
from app.utils.response import success_response, error_response
from app.core.auth import get_active_user
from app.models.user import User, Program
from app.models.building import Room, UserFavoriteRoom
from app.schemas.user import UserUpdate, LocationData
from app.schemas.building import AddFavoriteRooms

router = APIRouter()

@router.get("/user/details")
def get_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    4.5 Profile Management
    REQ-1: The system shall display the user's current profile information such as username, educational background, favourite classrooms, and an option to delete the profile.
    """
    # Get program information if it exists
    program_data = None
    faculty = None

    if current_user.program_id is not None:
        # Direct query for the program
        program = db.query(Program).filter(Program.id == current_user.program_id).first()

        if program:
            program_data = {
                "id": str(program.id),
                "name": program.name,
                "is_undergrad": program.is_undergrad,
                "faculty": program.faculty
            }
            faculty = program.faculty

    # Construct user data with program information
    user_data = {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "active": current_user.active,
        "program_id": str(current_user.program_id) if current_user.program_id else None,
        "program": program_data,
        "faculty": faculty
    }

    return success_response(200, True, "User found", data=user_data)

@router.put("/user/update")
def update_user(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    4.5 Profile Management
    REQ-2: The system shall enable users to edit their profile fields such as:
        Username (display name)
        Educational background (faculty and program)
        Favourite classrooms
    REQ-6: The system will ensure that the user's username is unique
    """
    user = filter_query(db, model=User, filters=[User.id == current_user.id])
    if not user:
        return error_response(404, False, "User not found")

    try:
        update_data = {}
        if user_data.username:
            update_data["username"] = user_data.username

        if user_data.program:
            program = db.query(Program).filter(Program.name == user_data.program).first()
            if not program:
                return error_response(404, False, "Program not found")
            update_data["program_id"] = program.id

        db.query(User).filter(User.id == current_user.id).update(update_data, synchronize_session=False)
        db.commit()
        return success_response(200, True, "User updated successfully")
    except Exception as e:
        return error_response(500, False, str(e))

@router.delete("/user/delete")
def delete_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    4.5 Profile Management
    REQ-1: The system shall display the user's current profile information such as username, educational background, favourite classrooms, and an option to delete the profile.
    REQ-5: The system shall enable users to delete their profiles entirely.
    """
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
    """
    4.5 Profile Management
    REQ-3: The system shall show a list of classrooms the user selected as "favourites".
    """
    try:
        total_count = (
            db.query(Room)
            .join(UserFavoriteRoom)
            .filter(UserFavoriteRoom.user_id == current_user.id)
            .count()
        )

        favorite_rooms = (
            db.query(Room, UserFavoriteRoom.notification_sent)
            .join(UserFavoriteRoom)
            .filter(UserFavoriteRoom.user_id == current_user.id)
            .limit(per_page)
            .offset((page - 1) * per_page)
            .all()
        )

        favorite_rooms_data = [
            {
                "room_name": room.name,
                "notification_sent": notification_sent
            }
            for room, notification_sent in favorite_rooms
        ]

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
    """
    4.5 Profile Management
    REQ-4: The system shall allow users to select and update their favourite classrooms for easier access and personalization.
    """
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
    """
    4.5 Profile Management
    REQ-4: The system shall allow users to select and update their favourite classrooms for easier access and personalization.
    """
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

        favorite = UserFavoriteRoom(user_id=current_user.id, room_id=room.id, notification_sent=True)
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

@router.put("/user/toggle_notification")
def toggle_notification(
    room_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    4.6 Notifications
    REQ-2: The system shall provide users with granular controls to enable or disable notifications for each of their favourite rooms individually.
    """
    try:
        room = db.query(Room).filter(Room.name == room_name).first()

        if not room:
            return error_response(404, False, "Room not found")

        user_favorite_room = db.query(UserFavoriteRoom).filter(
            UserFavoriteRoom.user_id == current_user.id,
            UserFavoriteRoom.room_id == room.id
        ).first()

        if not user_favorite_room:
            return error_response(404, False, "Room not favorited by the user")

        user_favorite_room.notification_sent = not user_favorite_room.notification_sent

        db.commit()
        db.refresh(user_favorite_room)

        return success_response(
            200,
            True,
            f"Notification status toggled successfully. Current status: {user_favorite_room.notification_sent}",
            data={"room_name": room_name, "notification_sent": user_favorite_room.notification_sent}
        )

    except Exception as e:
        db.rollback()
        return error_response(500, False, str(e))

@router.post("/calculate_distances")
async def calculate_distances(locations: LocationData):
    """
    4.7 Location Services
    REQ-2: The system shall calculate distances from the user's location to all available study spaces.
    """
    try:
        def calculate_distance(start_lat, start_long, dest_lat, dest_long):
            start_lat = radians(start_lat)
            start_long = radians(start_long)
            dest_lat = radians(dest_lat)
            dest_long = radians(dest_long)

            dlon = dest_long - start_long
            dlat = dest_lat - start_lat
            a = sin(dlat / 2)**2 + cos(start_lat) * cos(dest_lat) * sin(dlon / 2)**2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            radius = 6371.0

            return radius * c

        results = []
        for destination in locations.destinations:
            if len(destination) != 3:
                return error_response(400, False, "Each destination must have exactly three items: [name, latitude, longitude].")

            name, dest_lat, dest_long = destination
            distance = calculate_distance(
                locations.start_lat,
                locations.start_long,
                dest_lat,
                dest_long
            )
            results.append({
                "name": name,
                "distance_km": distance
            })

        return {"distances": results}
    except Exception as e:
        return {"error": str(e)}
