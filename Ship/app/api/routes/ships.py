from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.crud.ship_service import create_ship, get_ships_by_board, validate_ship_placement
from app.schemas.ship import Ship as ShipSchema, ShipCreate
from typing import List

router = APIRouter()

@router.post("/", response_model=ShipSchema, status_code=status.HTTP_201_CREATED)
def create_new_ship(ship_data: ShipCreate, db: Session = Depends(get_db)):
    if not validate_ship_placement(db, ship_data.board_id, ship_data):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ship placement")
    return create_ship(db, ship_data)

@router.get("/{board_id}", response_model=List[ShipSchema])
def get_board_ships(board_id: int, db: Session = Depends(get_db)):
    return get_ships_by_board(db, board_id)