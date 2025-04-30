from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.crud.game_service import join_game
from app.crud.board_service import get_board_by_game_and_player, update_board
from app.crud.user_service import get_user_by_username, create_user
from app.crud.bot_service import bot_attack
from app.schemas.board import BoardCreate
from app.crud.ship_service import create_ship
from app.schemas.ship import ShipCreate
from app.schemas.users import UserCreate
import random
from dotenv import load_dotenv
import os

router = APIRouter()

load_dotenv()

@router.post("/{game_id}/call-bot", status_code=status.HTTP_201_CREATED)
def call_bot_to_join_game(game_id: int, db: Session = Depends(get_db)):

    #  create "user" for bot
    bot_username = "Bot"
    bot_user = get_user_by_username(db, bot_username)
    if not bot_user:
        bot_user = create_user(
            db,
            UserCreate(
                username=bot_username,
                email="bot@battleship.com",
                password=os.getenv("BOT_PASSWORD")
            )
        )

    game = join_game(db, game_id, bot_user.user_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found or bot already joined")

    bot_board = get_board_by_game_and_player(db, game_id, bot_user.user_id)
    if not bot_board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot board not found")

    ships = [
            {"type": "Carrier", "size": 5},
            {"type": "Battleship", "size": 4},
            {"type": "Cruiser", "size": 3},
            {"type": "Submarine", "size": 3},
            {"type": "Destroyer", "size": 2},
    ]

    board_size = 10
    for ship in ships:
        placed = False
        while not placed:
            direction = random.choice(["horizontal", "vertical"])
            start_row = random.randint(0, board_size - 1)
            start_col = random.randint(0, board_size - 1)

            coordinates = [
                (start_row, start_col + i) if direction == "horizontal" else (start_row + i, start_col)
                for i in range(ship["size"])
            ]

            if all(
                0 <= row < board_size and 0 <= col < board_size and bot_board.board_state[row][col] == "O" for row, col in coordinates):
                for row, col in coordinates:
                    bot_board.board_state[row][col] = "S"
                    create_ship(db, ShipCreate(board_id=bot_board.board_id, ship_type=ship["type"], ship_coordinates=coordinates)
            )
                placed = True

    update_board(db, bot_board.board_id, bot_board.board_state, board_status="locked")

    return {"message": "Bot has joined the game and ships have been placed. Game id: {game_id}"}


@router.post("/{game_id}/bot-attack", status_code=status.HTTP_200_OK)
def bot_attack_route(game_id: int, db: Session = Depends(get_db)):
    bot_user = get_user_by_username(db, "Bot")
    if not bot_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bot user not found")
    game = bot_attack(db, game_id, bot_user.user_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid attack or game finished")
    return game