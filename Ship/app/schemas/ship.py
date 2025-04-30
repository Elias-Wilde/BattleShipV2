from pydantic import BaseModel
from typing import Optional, List, Tuple
from datetime import datetime


class ShipCreate(BaseModel):
    board_id : int
    ship_type: str
    ship_coordinates: List[Tuple[int, int]]

class ShipBase(ShipCreate):
    ship_hits: List[Tuple[int, int]] = []

class Ship(ShipBase):
    ship_id: int

    class Config:
        from_attributes = True