from typing import List, Tuple

from pydantic import BaseModel


class ShipCreate(BaseModel):
    board_id: int
    ship_type: str
    ship_coordinates: List[Tuple[int, int]]


class ShipBase(ShipCreate):
    ship_hits: List[Tuple[int, int]] = []


class Ship(ShipBase):
    ship_id: int

    class Config:
        from_attributes = True


class ShipFiltered(BaseModel):
    ship_id: int
    ship_type: str
    is_sunk: bool  # Only true/false, no coordinates

    class Config:
        from_attributes = True
