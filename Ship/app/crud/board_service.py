from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified
from app.database.db_setup import get_db
from app.models.board import Board
from app.schemas.board import Board as BoardSchema, BoardCreate
from typing import List, Optional
from app.exceptions import NotFoundError, ValidationError
from app.schemas.board import BoardFiltered
from app.schemas.ship import ShipFiltered


# BOARD CRUD

def create_board(db: Session, board_data: BoardCreate) -> BoardSchema:
    db_board = Board(
        game_id=board_data.game_id,
        player_id=board_data.player_id,
        board_state=board_data.board_state
    )
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return BoardSchema.model_validate(db_board)

def get_board(db: Session, board_id: int) -> BoardSchema:
    board = db.query(Board).filter(Board.board_id == board_id).first()
    if not board:
        raise NotFoundError("Board")
    return BoardSchema.model_validate(board)

def get_board_by_game_and_player(db: Session, game_id: int, player_id: int) -> Optional[BoardSchema]:
    db_board = db.query(Board).filter(Board.game_id == game_id, Board.player_id == player_id).first()
    if not db_board:
        raise NotFoundError("Board not found for the game and player")
    return BoardSchema.model_validate(db_board)

def update_board(db: Session, board_id: int, board_state: List[List[str]], board_status: str) -> BoardSchema:
    board = db.query(Board).filter(Board.board_id == board_id).first()
    if not board:
        raise NotFoundError("Board")

    board.board_state = board_state
    board.board_status = board_status
    flag_modified(board, "board_state")
    flag_modified(board, "board_status")

    db.commit()
    db.refresh(board)
    return BoardSchema.model_validate(board)

def validate_board_lock(db: Session, board_id: int) -> bool:
    db_board = get_board(db, board_id)
    if not db_board:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Board not found")
    ships = db_board.ships
    if not ships or len(ships) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All ships must be placed before locking the board")
    return True

def update_board_cell(db: Session, board_id: int, coordinates: List[int], value: str) -> Optional[BoardSchema]:
    board = db.query(Board).filter(Board.board_id == board_id).first()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")

    x, y = coordinates
    if not (0 <= x < 10 and 0 <= y < 10):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid coordinates")

    board_state = board.board_state
    if board_state[x][y] in ["H", "M"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cell already updated")

    board_state[x][y] = value
    board.board_state = board_state.copy()
    flag_modified(board, "board_state")

    db.commit()
    db.refresh(board)
    return BoardSchema.model_validate(board)


def filter_board_for_opponent(board: Board) -> BoardFiltered:    
    # Filter board state - replace 'S' with 'O' to hide unhit ships
    filtered_board_state = [
        [cell if cell in ['H', 'M'] else 'O' for cell in row]
        for row in board.board_state
    ]
    
    # Only show ships that are completely sunk
    filtered_ships = []
    for ship in board.ships:
        is_sunk = len(ship.ship_hits) == len(ship.ship_coordinates)
        filtered_ships.append(
            ShipFiltered(
                ship_id=ship.ship_id,
                ship_type=ship.ship_type,
                is_sunk=is_sunk
            )
        )
    
    return BoardFiltered(
        board_id=board.board_id,
        game_id=board.game_id,
        player_id=board.player_id,
        board_state=filtered_board_state,
        board_status=board.board_status,
        ships=filtered_ships
    )


def get_board_for_player(db: Session, game_id: int, board_id: int, requesting_player_id: int) -> BoardSchema:
    from app.schemas.board import Board as BoardSchemaFull, BoardFiltered
    
    board = db.query(Board).filter(Board.board_id == board_id).first()
    if not board:
        raise NotFoundError("Board")
    
    # If player is requesting their own board, return full view
    if board.player_id == requesting_player_id:
        return BoardSchemaFull.model_validate(board)
    
    # If player is requesting opponent's board, return filtered view
    board_full = BoardSchemaFull.model_validate(board)
    return filter_board_for_opponent(board_full)