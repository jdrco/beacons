from typing import List
from uuid import UUID
from pydantic import BaseModel

class AddFavoriteRooms(BaseModel):
    room_ids: List[UUID]
