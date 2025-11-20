from typing import List, Optional

from app.schemas.ship import Ship, ShipFiltered
from pydantic import BaseModel, ConfigDict, Field, field_validator


class BoardBase(BaseModel):
    game_id: int = Field(..., gt=0, description="Game ID must be positive")
    player_id: int = Field(..., gt=0, description="Player ID must be positive")
    board_state: List[List[Optional[str]]]
    board_status: Optional[str] = "open"

    @field_validator("board_status")
    @classmethod
    def validate_status(cls, v):
        valid_statuses = ["open", "locked", "sunk"]
        if v not in valid_statuses:
            raise ValueError(f"Board status must be one of {valid_statuses}")
        return v

    @field_validator("board_state")
    @classmethod
    def validate_board_size(cls, v):
        if len(v) != 10 or any(len(row) != 10 for row in v):
            raise ValueError("Board must be 10x10")
        # Validate each cell contains only valid characters
        valid_chars = {"O", "S", "H", "M", None}
        for row in v:
            for cell in row:
                if cell not in valid_chars:
                    raise ValueError(f"Invalid cell value: {cell}")
        return v


class BoardCreate(BaseModel):
    game_id: int = Field(..., gt=0)
    player_id: int = Field(..., gt=0)
    board_state: List[List[Optional[str]]]

    @field_validator("board_state")
    @classmethod
    def validate_board_size(cls, v):
        if len(v) != 10 or any(len(row) != 10 for row in v):
            raise ValueError("Board must be 10x10")
        valid_chars = {"O", "S", "H", "M", None}
        for row in v:
            for cell in row:
                if cell not in valid_chars:
                    raise ValueError(f"Invalid cell value: {cell}")
        return v


class Board(BoardBase):
    board_id: int
    ships: List[Ship] = []

    model_config = ConfigDict(from_attributes=True)


class BoardFiltered(BaseModel):
    board_id: int
    game_id: int
    player_id: int
    board_state: List[List[Optional[str]]]
    board_status: Optional[str] = "open"
    ships: List[ShipFiltered] = []

    model_config = ConfigDict(from_attributes=True)
