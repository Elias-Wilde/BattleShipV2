from sqlalchemy.orm import Session
from app.models.ship import Ship
from app.schemas.ship import Ship as ShipSchema, ShipCreate
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional
from app.exceptions import ValidationError
from app.utils.audit_logger import AuditLogger
import logging

logger = logging.getLogger(__name__)

# SHIP CRUD

# create ship with validation (type, coordinates, bounds, overlaps, linearity)
def create_ship(db: Session, ship_data: ShipCreate) -> ShipSchema:
    if not validate_ship_placement(db, ship_data.board_id, ship_data):
        logger.warning(f"Invalid ship placement for board {ship_data.board_id}")
        raise ValidationError("Invalid ship placement")
    
    valid_ship_types = ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"]
    if ship_data.ship_type not in valid_ship_types:
        logger.warning(f"Invalid ship type: {ship_data.ship_type}")
        raise ValidationError("Invalid ship type")
    
    # Create ship record
    db_ship = Ship(
        board_id=ship_data.board_id,
        ship_type=ship_data.ship_type,
        ship_coordinates=ship_data.ship_coordinates,
    )
    db.add(db_ship)
    db.commit()
    db.refresh(db_ship)
    
    logger.info(f"Ship {ship_data.ship_type} created on board {ship_data.board_id}")
    
    return ShipSchema.model_validate(db_ship)

def get_ships_by_board(db: Session, board_id: int) -> List[ShipSchema]:
    ships = db.query(Ship).filter(Ship.board_id == board_id).all()
    return [ShipSchema.model_validate(ship) for ship in ships]

def update_ship_hits(db: Session, ship_id: int, hit_coordinates: tuple[int]) -> Optional[ShipSchema]:
    ship = db.query(Ship).filter(Ship.ship_id == ship_id).first()
    if ship:
        ship.ship_hits.append(hit_coordinates)
        flag_modified(ship, "ship_hits")
        db.commit()
        db.refresh(ship)
        return ShipSchema.model_validate(ship)
    return None

def validate_ship_placement(db: Session, board_id: int, ship_data: ShipCreate) -> bool:
    # Validate coordinates structure
    if not isinstance(ship_data.ship_coordinates, list) or len(ship_data.ship_coordinates) == 0:
        logger.warning(f"Invalid coordinate list for board {board_id}")
        return False
    
    # Validate all coordinates are tuples/lists of 2 integers
    for coord in ship_data.ship_coordinates:
        if not isinstance(coord, (tuple, list)) or len(coord) != 2:
            logger.warning(f"Invalid coordinate format: {coord}")
            return False
        if not isinstance(coord[0], int) or not isinstance(coord[1], int):
            logger.warning(f"Non-integer coordinates: {coord}")
            return False
    
    # Check coordinates are within bounds (0-9)
    if not all(0 <= coord[0] < 10 and 0 <= coord[1] < 10 for coord in ship_data.ship_coordinates):
        logger.warning(f"Out-of-bounds coordinates for board {board_id}")
        return False

    # no overlap with existing ships
    existing_ships = get_ships_by_board(db, board_id)
    for existing_ship in existing_ships:
        if any(coord in existing_ship.ship_coordinates for coord in ship_data.ship_coordinates):
            logger.warning(f"Ship overlap detected on board {board_id}")
            return False

    # check linearity
    if len(ship_data.ship_coordinates) > 1:
        is_horizontal = all(coord[0] == ship_data.ship_coordinates[0][0] for coord in ship_data.ship_coordinates)
        is_vertical = all(coord[1] == ship_data.ship_coordinates[0][1] for coord in ship_data.ship_coordinates)
        if not (is_horizontal or is_vertical):
            logger.warning(f"Non-linear ship placement on board {board_id}")
            return False
        
        # no gaps
        sorted_coords = sorted(ship_data.ship_coordinates)
        if is_horizontal:
            # Check if columns are continuous
            for i in range(1, len(sorted_coords)):
                if sorted_coords[i][1] - sorted_coords[i-1][1] != 1:
                    logger.warning(f"Non-continuous ship placement on board {board_id}")
                    return False
        else:
            # Check if rows are continuous
            for i in range(1, len(sorted_coords)):
                if sorted_coords[i][0] - sorted_coords[i-1][0] != 1:
                    logger.warning(f"Non-continuous ship placement on board {board_id}")
                    return False

    return True
