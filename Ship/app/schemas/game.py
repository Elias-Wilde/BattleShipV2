from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel


class GameBase(BaseModel):
    player1_id: int
    player2_id: Optional[int] = None
    turn: Optional[int] = None
    game_status: str
    winner_id: Optional[int] = None  # New field for winner
    created_at: datetime = datetime.now(timezone.utc)  # Set default value


class Game(GameBase):
    game_id: int

    class Config:
        from_attributes = True


class AttackData(BaseModel):
    coordinates: List[int]
