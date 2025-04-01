from typing import List
from pydantic import BaseModel

class AddFavoriteRooms(BaseModel):
    room_ids: List[str]
