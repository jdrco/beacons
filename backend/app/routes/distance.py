from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db  # adjust the path as necessary
from app.utils.distance_calculator import get_nearest_buildings

router = APIRouter()

@router.get("/nearest_buildings/")
def nearest_buildings(
    lat: float = Query(..., description="User latitude"),
    lon: float = Query(..., description="User longitude"),
    db: Session = Depends(get_db)
):
    """
    Get the nearest study spaces from the user's location by querying the database.
    """
    nearest = get_nearest_buildings(lat, lon, db)
    return {"user_location": (lat, lon), "nearest_buildings": nearest}

