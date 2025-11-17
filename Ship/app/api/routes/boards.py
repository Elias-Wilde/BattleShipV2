from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.crud.board_service import (
    create_board, 
    update_board, 
    get_board, 
    get_board_by_game_and_player, 
    validate_board_lock,
    get_board_for_player,
    filter_board_for_opponent
)
from app.schemas.board import Board as BoardSchema, BoardCreate, BoardFiltered
from app.crud.user_service import get_current_user_from_token
from app.models.users import User
from typing import List, Union
from app.exceptions import NotFoundError, ValidationError
from app.utils.audit_logger import AuditLogger
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=BoardSchema, status_code=status.HTTP_201_CREATED)
def create_new_board(board_data: BoardCreate, db: Session = Depends(get_db)):
    try:
        board = create_board(db, board_data)
        AuditLogger.log_security_event(
            event_type="BOARD_CREATED",
            severity="info",
            details={"board_id": board.board_id, "game_id": board_data.game_id}
        )
        return board
    except ValidationError as e:
        logger.warning(f"Invalid board creation attempt: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{board_id}", response_model=BoardSchema)
def update_board_details(
    board_id: int, 
    payload: dict, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Verify board ownership
        board = get_board(db, board_id)
        if board.player_id != current_user.user_id:
            AuditLogger.log_authorization_failure(
                user_id=current_user.user_id,
                action="update_board",
                resource=f"board:{board_id}",
                reason="User does not own board"
            )
            raise HTTPException(status_code=403, detail="You can only update your own board")
        
        board_state = payload.get("board_state")
        board_status = payload.get("board_status", "open")
        
        updated_board = update_board(db, board_id, board_state, board_status)
        
        AuditLogger.log_security_event(
            event_type="BOARD_UPDATED",
            severity="info",
            details={"board_id": board_id, "user_id": current_user.user_id}
        )
        return updated_board
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating board {board_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@router.get("/{board_id}", response_model=Union[BoardSchema, BoardFiltered])
def get_board_details(
    board_id: int, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        board = get_board(db, board_id)
        
        AuditLogger.log_data_access(
            user_id=current_user.user_id,
            resource_type="board",
            resource_id=board_id,
            action="READ"
        )
        
        # Return full view if own board
        if board.player_id == current_user.user_id:
            return board
        
        # Return filtered view (no ship positions)
        return filter_board_for_opponent(board)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching board {board_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@router.get("/{game_id}/{player_id}", response_model=Union[BoardSchema, BoardFiltered])
def get_board_details_by_game_and_player(
    game_id: int, 
    player_id: int, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):

    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    board = get_board_by_game_and_player(db, game_id=game_id, player_id=player_id)
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Board not found"
        )
    
    AuditLogger.log_data_access(
        user_id=current_user.user_id,
        resource_type="board",
        resource_id=board.board_id,
        action="READ"
    )
    
    # Return full view if own board
    if board.player_id == current_user.user_id:
        return board
    
    # (no ship positions)
    return filter_board_for_opponent(board)