from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.occupancy import RoomOccupancy, RoomCount, ActivityEvent
from app.utils.response import success_response, error_response
from app.core.auth import get_active_user
from app.models.user import User

router = APIRouter()

@router.get("/occupancy/rooms", tags=["occupancy"])
async def get_all_occupied_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    Get a list of all rooms that currently have active occupants,
    along with the count of occupants in each room
    """
    try:
        # Get room counts directly from the room_counts table
        room_counts = db.query(RoomCount).filter(
            RoomCount.occupant_count > 0
        ).all()
        
        # Convert to a list of dictionaries
        result = [
            {
                "room_name": room.room_name,
                "occupant_count": room.occupant_count,
                "last_updated": room.last_updated.isoformat()
            }
            for room in room_counts
        ]
        
        return success_response(
            status_codes=200,
            status=True,
            message="Room occupancy data retrieved successfully",
            data=result
        )
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message=f"Error retrieving room occupancy: {str(e)}"
        )

@router.get("/occupancy/buildings", tags=["occupancy"])
async def get_building_occupancy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    Get occupancy counts for buildings by aggregating room data.
    Since room names typically include building names (e.g., "ETLC 1-001"),
    we extract the building prefix and aggregate by it.
    """
    try:
        # Get all rooms with occupants
        rooms_with_occupants = db.query(RoomCount).filter(
            RoomCount.occupant_count > 0
        ).all()
        
        # Group by building (first part of room name)
        building_counts = {}
        for room in rooms_with_occupants:
            # Extract building name from room name (assuming format like "ETLC 1-001")
            # This is a simple implementation - adjust based on your actual room naming convention
            building_name = room.room_name.split()[0] if ' ' in room.room_name else room.room_name
            
            if building_name not in building_counts:
                building_counts[building_name] = {
                    'count': 0,
                    'last_updated': room.last_updated
                }
            
            building_counts[building_name]['count'] += room.occupant_count
            # Use the most recent update time
            if room.last_updated > building_counts[building_name]['last_updated']:
                building_counts[building_name]['last_updated'] = room.last_updated
            
        # Convert to a list of dictionaries
        result = [
            {
                "building_name": building_name,
                "occupant_count": data['count'],
                "last_updated": data['last_updated'].isoformat()
            }
            for building_name, data in building_counts.items()
        ]
        
        return success_response(
            status_codes=200,
            status=True,
            message="Building occupancy data retrieved successfully",
            data=result
        )
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message=f"Error retrieving building occupancy: {str(e)}"
        )

@router.get("/occupancy/room/{room_name}", tags=["occupancy"])
async def get_room_occupancy(
    room_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    Get detailed occupancy data for a specific room, including user information
    and study topics of current occupants
    """
    try:
        now = datetime.now()
        
        # Get room count from room_counts table
        room_count = db.query(RoomCount).filter(
            RoomCount.room_name == room_name
        ).first()
        
        occupant_count = room_count.occupant_count if room_count else 0
        last_updated = room_count.last_updated.isoformat() if room_count else None
        
        # Get active check-ins for the specified room
        active_checkins = db.query(RoomOccupancy).filter(
            RoomOccupancy.room_name == room_name,
            RoomOccupancy.is_active == True,
            RoomOccupancy.expiry_time > now
        ).all()
        
        # Get occupant details
        occupants = [
            {
                "user_id": checkin.user_id,
                "username": checkin.username,
                "study_topic": checkin.study_topic,
                "checkin_time": checkin.checkin_time.isoformat(),
                "expiry_time": checkin.expiry_time.isoformat()
            }
            for checkin in active_checkins
        ]
        
        result = {
            "room_name": room_name,
            "occupant_count": occupant_count,
            "last_updated": last_updated,
            "occupants": occupants
        }
        
        return success_response(
            status_codes=200,
            status=True,
            message=f"Occupancy data for {room_name} retrieved successfully",
            data=result
        )
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message=f"Error retrieving room occupancy: {str(e)}"
        )

@router.get("/occupancy/activity/{room_name}", tags=["occupancy"])
async def get_room_activity(
    room_name: str,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    Get recent activity events for a specific room
    """
    try:
        # Get activity events for the specified room
        events = db.query(ActivityEvent).filter(
            ActivityEvent.room_name == room_name
        ).order_by(
            ActivityEvent.timestamp.desc()
        ).limit(limit).all()
        
        # Convert to a list of dictionaries
        result = [
            {
                "type": event.type,
                "username": event.username,
                "study_topic": event.study_topic,
                "timestamp": event.timestamp.isoformat(),
                "message": event.message
            }
            for event in events
        ]
        
        return success_response(
            status_codes=200,
            status=True,
            message=f"Activity data for {room_name} retrieved successfully",
            data=result
        )
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message=f"Error retrieving room activity: {str(e)}"
        )