from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.schemas.ship import Ship

class BoardBase(BaseModel):
    game_id : int
    player_id : int
    board_state : List[List[Optional[str]]]
    board_status: Optional[str] = "open"


class BoardCreate(BaseModel):
    game_id: int
    player_id: int
    board_state: List[List[Optional[str]]]

class Board(BoardBase):
    board_id: int
    ships: List[Ship] = []

    class Config:
        from_attributes = True