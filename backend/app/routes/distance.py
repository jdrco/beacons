from fastapi import APIRouter, Query
from app.utils.distance_calculator import get_nearest_buildings

router = APIRouter()

@router.get("/nearest_buildings/")
def nearest_buildings(lat: float = Query(..., description="User latitude"),
                      lon: float = Query(..., description="User longitude")):
    """
    Get the nearest study spaces from the user's location.
    """
    nearest = get_nearest_buildings(lat, lon)
    return {"user_location": (lat, lon), "nearest_buildings": nearest}
