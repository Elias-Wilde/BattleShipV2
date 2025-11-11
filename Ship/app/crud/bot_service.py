from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified
from app.database.db_setup import get_db
from app.schemas.game import Game as GameSchema
from app.models.game import Game
from typing import List, Optional

from app.crud.board_service import get_board_by_game_and_player, update_board
from app.crud.game_service import attack
from app.exceptions import NotFoundError, ValidationError

import random


def bot_attack(db: Session, game_id: int, bot_id: int) -> Optional[GameSchema]:
    db_game = db.query(Game).filter(Game.game_id == game_id).first()
    if not db_game:
        raise NotFoundError("Game")
    if db_game.turn != bot_id:
        raise ValidationError(f"Not bots turn: {db_game.turn},Bot ID: {bot_id}")
    if db_game.game_status != "playing":
        raise ValidationError("game is not in playing state")

    player_board = get_board_by_game_and_player(db, game_id, db_game.player1_id)
    if not player_board:
        raise NotFoundError("Player board")

    board_size = len(player_board.board_state)
    while True:
        row = random.randint(0, board_size - 1)
        col = random.randint(0, board_size - 1)
        if player_board.board_state[row][col] in ["O", "S"]: # only attack empty or ship cells
            break

    return attack(db, game_id, bot_id, [row, col])
