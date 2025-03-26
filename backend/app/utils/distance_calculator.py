from math import radians, cos, sin, sqrt, atan2
from sqlalchemy.orm import Session
from app.models.building import Building

def get_building_coordinates_from_db(db: Session):
    buildings = db.query(Building).all()
    # Map building names (or IDs) to a tuple of coordinates.
    return {building.name: (float(building.latitude), float(building.longitude)) for building in buildings}

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points on Earth."""
    R = 6371  # Earth radius in km
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def get_nearest_buildings_db(user_lat: float, user_lon: float, db: Session):
    buildings = get_building_coordinates_from_db(db)
    distances = [
        {
            "building": name,
            "distance_km": round(haversine(user_lat, user_lon, lat, lon), 3)
        }
        for name, (lat, lon) in buildings.items()
    ]
    return sorted(distances, key=lambda x: x["distance_km"])

