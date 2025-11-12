from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified
from app.database.db_setup import get_db
from app.schemas.game import Game as GameSchema
from app.models.game import Game
from typing import List, Optional, Tuple

from app.crud.board_service import get_board_by_game_and_player, update_board
from app.crud.game_service import attack
from app.exceptions import NotFoundError, ValidationError

import random


class BotAI:

    # better Bot, switching between move modes to follow up on hits
    
    def __init__(self, board_state: list):
        self.board_state = board_state
        self.board_size = len(board_state)
        self.last_hit = None
        self.target_mode = False
        self.search_directions = []
        self.failed_directions = set()
    
    def get_next_move(self) -> Tuple[int, int]:
        # follow up on last hits
        if self.target_mode and self.last_hit:
            move = self._target_mode()
            if move:
                return move
            # fall back if no valid target found
            self.target_mode = False
        
        # Hunt mode: search for ships randomly, avoiding water
        return self._hunt_mode()
    
    def _hunt_mode(self) -> Tuple[int, int]:
        # random hunting for ships
        attempts = 0
        max_attempts = 100
        
        while attempts < max_attempts:
            row = random.randint(0, self.board_size - 1)
            col = random.randint(0, self.board_size - 1)
            cell = self.board_state[row][col]
            
            # only attack unattacked cells
            if cell in ["O", "S"]:
                return (row, col)
            
            attempts += 1
        
        # fallback find any unattacked cell
        for row in range(self.board_size):
            for col in range(self.board_size):
                if self.board_state[row][col] in ["O", "S"]:
                    return (row, col)
        
        # this should never reach here
        return (random.randint(0, self.board_size - 1), random.randint(0, self.board_size - 1))
    
    def _target_mode(self) -> Optional[Tuple[int, int]]:
        """Try to sink ship after a hit - search adjacent cells"""
        row, col = self.last_hit
        
        # search order
        directions = [
            (row - 1, col),
            (row + 1, col),  
            (row, col - 1), 
            (row, col + 1),  
        ]
        
        for next_row, next_col in directions:
            # check bounds
            if not (0 <= next_row < self.board_size and 0 <= next_col < self.board_size):
                continue
            
            cell = self.board_state[next_row][next_col]
            # if another hit, continue in same direction
            if cell == "H":
                continue
            # if unattacked, attack
            if cell in ["O", "S"]:
                return (next_row, next_col)
        
        return None
    
    def update_hit(self, row: int, col: int, was_hit: bool):
        # update bot "knowledge"
        if was_hit:
            self.last_hit = (row, col)
            self.target_mode = True
        else:
            # miss => mark direction as failed
            if self.target_mode and self.last_hit:
                self.failed_directions.add((row, col))


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

    # use smart bot logic
    bot = BotAI(player_board.board_state)
    row, col = bot.get_next_move()

    return attack(db, game_id, bot_id, [row, col])
