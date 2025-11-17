from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.crud.game_service import (
    create_game, 
    get_game, 
    join_game, 
    attack, 
    start_game, 
    surrender,
    check_game_access
)
from app.schemas.game import Game as GameSchema, AttackData
from app.models.game import Game
from app.models.users import User
from app.crud.user_service import get_current_user_from_token
from app.exceptions import NotFoundError, ValidationError, PermissionError
from app.utils.audit_logger import AuditLogger
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# verifying user permission before each operation

@router.post("/", response_model=GameSchema, status_code=status.HTTP_201_CREATED)
def create_new_game(
    player1_id: int, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):  
    if current_user.user_id != player1_id:
        AuditLogger.log_authorization_failure(
            user_id=current_user.user_id,
            action="create_game",
            resource=f"user:{player1_id}",
            reason="User can only create games for themselves"
        )
        raise HTTPException(status_code=403, detail="You can only create games for yourself")
    
    new_game = create_game(db, player1_id)
    AuditLogger.log_game_access(
        user_id=current_user.user_id,
        game_id=new_game.game_id,
        action="create",
        success=True
    )
    return new_game


@router.put("/{game_id}/join", response_model=GameSchema)
def join_existing_game(
    game_id: int, 
    player2_id: int, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.user_id != player2_id:
        AuditLogger.log_authorization_failure(
            user_id=current_user.user_id,
            action="join_game",
            resource=f"user:{player2_id}",
            reason="User can only join games as themselves"
        )
        raise HTTPException(status_code=403, detail="You can only join games as yourself")
    
    game = join_game(db, game_id, player2_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    
    AuditLogger.log_game_access(
        user_id=current_user.user_id,
        game_id=game_id,
        action="join",
        success=True
    )
    logger.info(f"User {player2_id} joined game {game_id}")
    return game

@router.put("/{game_id}/start", response_model=GameSchema)
def start_game_route(
    game_id: int, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    check_game_access(db, game_id, current_user)
    
    started_game = start_game(db, game_id)
    if not started_game:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Game cannot be started")
    
    AuditLogger.log_game_action(
        user_id=current_user.user_id,
        game_id=game_id,
        action="start",
        details={"status": "started"}
    )
    logger.info(f"Game {game_id} started by user {current_user.user_id}")
    return started_game


@router.get("/games", response_model=list[GameSchema])
def get_all_games(
    skip: int = 0, 
    limit: int = 100, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    games = db.query(Game).offset(skip).limit(limit).all()
    AuditLogger.log_data_access(
        user_id=current_user.user_id,
        resource_type="games",
        resource_id="*",
        action="LIST"
    )
    return games

@router.get("/{game_id}", response_model=GameSchema)
def get_game_details(
    game_id: int, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    check_game_access(db, game_id, current_user)
    try:
        AuditLogger.log_data_access(
            user_id=current_user.user_id,
            resource_type="game",
            resource_id=game_id,
            action="READ"
        )
        return get_game(db, game_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

@router.post("/{game_id}/attack", response_model=GameSchema)
def attack_game(
    game_id: int, 
    player_id: int, 
    attack_data: AttackData, 
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.user_id != player_id:
        AuditLogger.log_authorization_failure(
            user_id=current_user.user_id,
            action="attack",
            resource=f"game:{game_id}",
            reason="User can only attack as themselves"
        )
        raise HTTPException(status_code=403, detail="You can only attack as yourself")
    
    try:
        updated_game = attack(db, game_id, player_id, attack_data.coordinates)
        AuditLogger.log_game_action(
            user_id=current_user.user_id,
            game_id=game_id,
            action="attack",
            details={"coordinates": attack_data.coordinates}
        )
        return updated_game
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}",)


@router.post("/{game_id}/surrender", response_model=GameSchema)
def surrender_game(
    game_id: int,
    player_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.user_id != player_id:
        AuditLogger.log_authorization_failure(
            user_id=current_user.user_id,
            action="surrender",
            resource=f"game:{game_id}",
            reason="User can only surrender as themselves"
        )
        raise HTTPException(status_code=403, detail="You can only surrender as yourself")
    
    try:
        updated_game = surrender(db, game_id, player_id)
        AuditLogger.log_game_action(
            user_id=current_user.user_id,
            game_id=game_id,
            action="surrender",
            details={"surrendered_by": player_id}
        )
        return updated_game
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")