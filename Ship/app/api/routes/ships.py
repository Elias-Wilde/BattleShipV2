from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.crud.ship_service import create_ship, get_ships_by_board, validate_ship_placement
from app.crud.board_service import get_board
from app.schemas.ship import Ship as ShipSchema, ShipCreate
from app.models.users import User
from app.crud.user_service import get_current_user_from_token
from typing import List

router = APIRouter()

@router.post("/", response_model=ShipSchema, status_code=status.HTTP_201_CREATED)
def create_new_ship(
    ship_data: ShipCreate, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify the board belongs to the current user
    board = get_board(db, ship_data.board_id)
    if board.player_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You can only place ships on your own board")
    
    if not validate_ship_placement(db, ship_data.board_id, ship_data):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ship placement")
    return create_ship(db, ship_data)

@router.get("/{board_id}", response_model=List[ShipSchema])
def get_board_ships(
    board_id: int, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify the board belongs to the current user
    board = get_board(db, board_id)
    if board.player_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You can only view ships on your own board")
    
    return get_ships_by_board(db, board_id)