from pydantic import BaseModel

class UserLocation(BaseModel):
    latitude: float
    longitude: float
