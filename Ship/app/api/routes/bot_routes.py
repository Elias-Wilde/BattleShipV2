from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.crud.bot_service import call_bot_to_join, perform_bot_attack
from app.crud.user_service import get_current_user_from_token
from app.models.users import User
from app.utils.audit_logger import AuditLogger
from app.exceptions import NotFoundError, ValidationError, PermissionError
from app.schemas.game import Game as GameSchema
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/{game_id}/call-bot", response_model=GameSchema, status_code=status.HTTP_201_CREATED)
def call_bot_to_join_game(
    game_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # Call bot to join game as opponent
    try:
        result = call_bot_to_join(db, game_id, current_user.user_id)
        
        AuditLogger.log_game_action(
            user_id=current_user.user_id,
            game_id=game_id,
            action="call_bot",
            details={"bot_joined": True}
        )
        
        logger.info(f"Bot joined game {game_id} at request of user {current_user.user_id}")
        return result
    
    except PermissionError as e:
        AuditLogger.log_authorization_failure(
            user_id=current_user.user_id,
            action="call_bot",
            resource=f"game:{game_id}",
            reason=str(e)
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    
    except Exception as e:
        logger.error(f"Unexpected error in call_bot_to_join_game: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.post("/{game_id}/bot-attack", response_model=GameSchema, status_code=status.HTTP_200_OK)
def bot_attack_route(
    game_id: int,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # Trigger bot's turn attack
    try:
        updated_game = perform_bot_attack(db, game_id, current_user.user_id)
        
        AuditLogger.log_game_action(
            user_id=current_user.user_id,
            game_id=game_id,
            action="bot_attack_triggered",
            details={}
        )
        
        logger.info(f"Bot attack triggered in game {game_id} by user {current_user.user_id}")
        return updated_game
    
    except PermissionError as e:
        AuditLogger.log_authorization_failure(
            user_id=current_user.user_id,
            action="bot_attack",
            resource=f"game:{game_id}",
            reason=str(e)
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    
    except Exception as e:
        logger.error(f"Unexpected error in bot_attack_route: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )