import json
from math import radians, cos, sin, sqrt, atan2
from pathlib import Path

# Get the base directory of the project
BASE_DIR = Path(__file__).resolve().parents[1]

# Construct the correct path to the JSON file
BUILDING_COORDINATES_FILE = BASE_DIR / "ualberta_buildings.json"

def parse_building_coordinates():
    """Parses the ualberta_buildings.json file and returns a dictionary of coordinates."""
    buildings = {}
    with open(BUILDING_COORDINATES_FILE, 'r') as file:
        data = json.load(file)
        for code, info in data.items():
            lat = info["coordinates"]["latitude"]
            lon = info["coordinates"]["longtitude"]  
            buildings[code] = (float(lat), float(lon))
    return buildings

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points on Earth."""
    R = 6371  # Earth radius in km
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def get_nearest_buildings(user_lat=None, user_lon=None):
    """
    If user_lat/user_lon are provided, sort by distance.
    Otherwise, sort buildings alphabetically.
    """
    buildings = parse_building_coordinates()
    
    # If coordinates are not provided, sort by name
    if user_lat is None or user_lon is None:
        return [
            {"building": name, "distance_km": None}
            for name in sorted(buildings.keys())
        ]

    # Else, compute distances and sort by distance
    distances = []
    for name, (lat, lon) in buildings.items():
        distance_km = round(haversine(user_lat, user_lon, float(lat), float(lon)), 3)
        distances.append({"building": name, "distance_km": distance_km})
    
    return sorted(distances, key=lambda x: x["distance_km"])
