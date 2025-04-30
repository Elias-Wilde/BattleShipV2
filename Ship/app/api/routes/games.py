from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.crud.game_service import create_game, get_game, join_game, attack, start_game
from app.schemas.game import Game as GameSchema, AttackData
from app.models.game import Game

router = APIRouter()

@router.post("/", response_model=GameSchema, status_code=status.HTTP_201_CREATED)
def create_new_game(player1_id: int, db: Session = Depends(get_db)):
    return create_game(db, player1_id)

@router.put("/{game_id}/join", response_model=GameSchema)
def join_existing_game(game_id: int, player2_id: int, db: Session = Depends(get_db)):
    game = join_game(db, game_id, player2_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game

@router.put("/{game_id}/start", response_model=GameSchema)
def start_game_route(game_id: int, db: Session = Depends(get_db)):
    game = start_game(db, game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game cannot be started")
    return game


@router.get("/games", response_model=list[GameSchema])
def get_all_games(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    games = db.query(Game).offset(skip).limit(limit).all()
    return games

@router.get("/{game_id}", response_model=GameSchema)
def get_game_details(game_id: int, db: Session = Depends(get_db)):
    game = get_game(db, game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game

@router.post("/{game_id}/attack", response_model=GameSchema)
def attack_game(game_id: int, player_id: int, attack_data: AttackData, db: Session = Depends(get_db)):
    game = attack(db, game_id, player_id, attack_data.coordinates)
    if not game:
        print(game)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid attack or game finished")
    return game