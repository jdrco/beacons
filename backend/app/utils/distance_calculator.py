from math import radians, cos, sin, sqrt, atan2
from app.models.building import Building

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points on Earth."""
    R = 6371  # Earth radius in km
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def get_nearest_buildings(user_lat, user_lon, db):
    """
    Query the database for all buildings, compute the distance to each from the user's location,
    and return a sorted list of building names with distances.
    """
    if user_lat is None or user_lon is None:
        return {"error": "User location is required to find nearest buildings."}

    # Query all buildings from the database
    buildings = db.query(Building).all()

    distances = [
        {
            "building": building.name,
            "distance_km": round(haversine(user_lat, user_lon, float(building.latitude), float(building.longitude)), 3)
        }
        for building in buildings
    ]
    return sorted(distances, key=lambda x: x["distance_km"])
