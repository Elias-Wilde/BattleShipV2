from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.crud.board_service import create_board, update_board, get_board, get_board_by_game_and_player, validate_board_lock
from app.schemas.board import Board as BoardSchema, BoardCreate
from typing import List
from app.exceptions import NotFoundError, ValidationError

router = APIRouter()

@router.post("/", response_model=BoardSchema, status_code=status.HTTP_201_CREATED)
def create_new_board(board_data: BoardCreate, db: Session = Depends(get_db)):
    return create_board(db, board_data)

@router.put("/{board_id}", response_model=BoardSchema)
def update_board_details(board_id: int, payload: dict, db: Session = Depends(get_db)):
    try:
        board_state = payload.get("board_state")
        board_status = payload.get("board_status", "open")
        return update_board(db, board_id, board_state, board_status)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

@router.get("/{board_id}", response_model=BoardSchema)
def get_board_details(board_id: int, db: Session = Depends(get_db)):
    try:
        return get_board(db, board_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

@router.get("/{game_id}/{player_id}", response_model=BoardSchema)
def get_board_details_by_game_and_player(game_id: int, player_id: int, db: Session = Depends(get_db)):
    board = get_board_by_game_and_player(db, game_id=game_id, player_id=player_id)
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return board