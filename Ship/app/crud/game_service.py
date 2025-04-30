from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm.attributes import flag_modified

from app.models.game import Game
from app.schemas.game import Game as GameSchema
from app.schemas.board import BoardCreate
from app.crud.board_service import create_board, get_board_by_game_and_player, update_board_cell
from app.crud.ship_service import get_ships_by_board, update_ship_hits


# GAME CRUD

def create_game(db: Session, player1_id: int) -> GameSchema:
    db_game = Game(player1_id=player1_id, game_status="waiting", created_at=datetime.now(timezone.utc))
    db.add(db_game)
    db.commit()
    db.refresh(db_game)
    return GameSchema.model_validate(db_game)

def get_game(db: Session, game_id: int) -> Optional[GameSchema]:
    db_game = db.query(Game).filter(Game.game_id == game_id).first()
    if db_game:
        return GameSchema.model_validate(db_game)
    return None

def join_game(db: Session, game_id: int, player2_id: int) -> Optional[GameSchema]:
    db_game = db.query(Game).filter(Game.game_id == game_id).first()
    if db_game and not db_game.player2_id:
        db_game.player2_id = player2_id
        db_game.game_status = "in_progress"
        db_game.turn = db_game.player1_id
        db.commit()
        db.refresh(db_game)

        # Create boards for both players
        create_board(db, BoardCreate(game_id=game_id, player_id=db_game.player1_id, board_state=[["O"] * 10 for _ in range(10)]))
        create_board(db, BoardCreate(game_id=game_id, player_id=player2_id, board_state=[["O"] * 10 for _ in range(10)]))

        return GameSchema.model_validate(db_game)
    return None

def attack(db: Session, game_id: int, player_id: int, coordinates: List[int]) -> Optional[GameSchema]:
    db_game = db.query(Game).filter(Game.game_id == game_id).first()
    if not db_game or db_game.turn != player_id or db_game.game_status == "finished":
        return None

    opponent_board = get_board_by_game_and_player(db, game_id, db_game.player2_id if player_id == db_game.player1_id else db_game.player1_id)
    if not opponent_board:
        return None

    # Check for hit
    ships = get_ships_by_board(db, opponent_board.board_id)
    hit_ship = next((ship for ship in ships if tuple(coordinates) in ship.ship_coordinates), None)

    if hit_ship:
        print(f"Hit on ship: {hit_ship.ship_id}")
        update_ship_hits(db, hit_ship.ship_id, tuple(coordinates))
        update_board_cell(db, opponent_board.board_id, coordinates, "H")
    else:
        update_board_cell(db, opponent_board.board_id, coordinates, "M")

    # Check if all ships on the opponent's board have been sunk
    # refetch ships from db to get updated
    ships = get_ships_by_board(db, opponent_board.board_id)
    all_sunk = all(len(ship.ship_hits) == len(ship.ship_coordinates) for ship in ships)
    for ship in ships:
        print(f"Ship {ship.ship_id} coordinates: {ship.ship_coordinates}")
        print(f"Ship {ship.ship_id} hits: {ship.ship_hits}")
    print(all_sunk)
    if all_sunk:
        db_game.game_status = "finished"
        db_game.winner_id = player_id
        flag_modified(db_game, "game_status")
        flag_modified(db_game, "winner_id")
        db.commit()
        db.refresh(db_game)
        return GameSchema.model_validate(db_game)

    # Switch turn
    db_game.turn = db_game.player2_id if db_game.turn == db_game.player1_id else db_game.player1_id
    flag_modified(db_game, "turn")
    db.commit()
    db.refresh(db_game)
    return GameSchema.model_validate(db_game)
