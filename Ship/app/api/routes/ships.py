import logging
from typing import List

from app.crud.board_service import get_board
from app.crud.ship_service import (
    create_ship,
    get_ships_by_board,
    validate_ship_placement,
)
from app.crud.user_service import get_current_user_from_token
from app.database.db_setup import get_db
from app.models.users import User
from app.schemas.ship import Ship as ShipSchema
from app.schemas.ship import ShipCreate
from app.utils.audit_logger import AuditLogger
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=ShipSchema, status_code=status.HTTP_201_CREATED)
def create_new_ship(
    ship_data: ShipCreate, current_user: User = Depends(get_current_user_from_token), db: Session = Depends(get_db)
):

    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        board = get_board(db, ship_data.board_id)
        if board.player_id != current_user.user_id:
            AuditLogger.log_authorization_failure(
                user_id=current_user.user_id,
                action="place_ship",
                resource=f"board:{ship_data.board_id}",
                reason="User does not own board",
            )
            raise HTTPException(status_code=403, detail="You can only place ships on your own board")

        if not validate_ship_placement(db, ship_data.board_id, ship_data):
            logger.warning(f"Invalid ship placement for user {current_user.user_id} on board {ship_data.board_id}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ship placement")

        ship = create_ship(db, ship_data)

        AuditLogger.log_security_event(
            event_type="SHIP_PLACED",
            severity="info",
            details={
                "ship_id": ship.ship_id,
                "board_id": ship_data.board_id,
                "user_id": current_user.user_id,
                "ship_type": ship_data.ship_type,
            },
        )
        return ship
    except Exception as e:
        logger.error(f"Error placing ship: {str(e)}")
        raise HTTPException(status_code=500, detail="Error placing ship")


@router.get("/{board_id}", response_model=List[ShipSchema])
def get_board_ships(
    board_id: int, current_user: User = Depends(get_current_user_from_token), db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        board = get_board(db, board_id)
        if board.player_id != current_user.user_id:
            AuditLogger.log_authorization_failure(
                user_id=current_user.user_id,
                action="view_ships",
                resource=f"board:{board_id}",
                reason="User does not own board",
            )
            raise HTTPException(status_code=403, detail="You can only view ships on your own board")

        AuditLogger.log_data_access(
            user_id=current_user.user_id, resource_type="ships", resource_id=board_id, action="READ"
        )

        return get_ships_by_board(db, board_id)
    except Exception as e:
        logger.error(f"Error fetching ships: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching ships")
