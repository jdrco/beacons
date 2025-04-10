from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import pytz

from app.core.database import get_db
from app.models.occupancy import RoomOccupancy
from app.models.user import User, Program
from app.utils.response import success_response, error_response

router = APIRouter()

# Define Edmonton timezone
EDMONTON_TZ = pytz.timezone('America/Edmonton')

def get_edmonton_time():
    """Get current time in Edmonton (Mountain Time)"""
    return datetime.now(EDMONTON_TZ)

@router.get("/{room_name}/demographics")
async def get_room_demographics(
    room_name: str,
    db: Session = Depends(get_db)
):
    """
    Get program demographics for users checked into a specific room
    """
    try:
        now = get_edmonton_time()
        
        # Query active check-ins for this room
        active_checkins = db.query(RoomOccupancy).filter(
            RoomOccupancy.room_name == room_name,
            RoomOccupancy.is_active == True,
            RoomOccupancy.expiry_time > now.replace(tzinfo=None)
        ).all()
        
        if not active_checkins:
            return success_response(
                status_codes=200,
                status=True,
                message="No active check-ins for this room",
                data={}
            )
        
        # Extract user IDs from check-ins
        user_ids = [checkin.user_id for checkin in active_checkins]
        
        # Query users along with their program information
        user_programs = db.query(
            User.id,
            Program.name.label("program_name")
        ).join(
            Program, 
            User.program_id == Program.id,
            isouter=True  # Left outer join to include users without programs
        ).filter(
            User.id.in_(user_ids)
        ).all()
        
        # Create a mapping of program names to counts
        program_counts = {}
        for user_id, program_name in user_programs:
            program_name = program_name or "Undeclared"  # Handle users without a program
            program_counts[program_name] = program_counts.get(program_name, 0) + 1
        
        return success_response(
            status_codes=200,
            status=True,
            message="Room demographics retrieved successfully",
            data=program_counts
        )
            
    except Exception as e:
        return error_response(
            status_codes=500,
            status=False,
            message=f"Error retrieving room demographics: {str(e)}"
        )