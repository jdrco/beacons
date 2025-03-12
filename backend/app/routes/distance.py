from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.auth import get_active_user
from app.core.database import get_db
from app.utils.distance_calculator import get_nearest_buildings
from app.utils.response import error_response, success_response

router = APIRouter()

@router.get("/nearest_buildings/")
def nearest_buildings_for_current_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    """
    1. If current_user has lat/lon => sort by distance.
    2. Otherwise => sort buildings alphabetically.
    """
    # If user location is missing, pass None
    if current_user.latitude is None or current_user.longitude is None:
        nearest = get_nearest_buildings()  # no args => triggers alphabetical sort
        return success_response(
            status_codes=200,
            status=True,
            message="Buildings sorted alphabetically (no user location).",
            data=nearest
        )
    
    # If we have coordinates, convert from Decimal -> float if needed
    lat = float(current_user.latitude)
    lon = float(current_user.longitude)
    nearest = get_nearest_buildings(lat, lon)

    return success_response(
        status_codes=200,
        status=True,
        message="Buildings sorted by distance from user location.",
        data=nearest
    )
