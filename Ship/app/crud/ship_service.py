from sqlalchemy.orm import Session
from app.models.ship import Ship
from app.schemas.ship import Ship as ShipSchema, ShipCreate
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional

# SHIP CRUD

def create_ship(db: Session, ship_data: ShipCreate) -> ShipSchema:
    db_ship = Ship(
        board_id=ship_data.board_id,
        ship_type=ship_data.ship_type,
        ship_coordinates=ship_data.ship_coordinates,
    )
    db.add(db_ship)
    db.commit()
    db.refresh(db_ship)
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
    # Ensure coordinates are within bounds
    if not all(0 <= coord[0] < 10 and 0 <= coord[1] < 10 for coord in ship_data.ship_coordinates):
        return False

    # Ensure no overlap with existing ships
    existing_ships = get_ships_by_board(db, board_id)
    for existing_ship in existing_ships:
        if any(coord in existing_ship.ship_coordinates for coord in ship_data.ship_coordinates):
            return False

    # Ensure ship is either horizontal or vertical
    if len(ship_data.ship_coordinates) > 1:
        is_horizontal = all(coord[0] == ship_data.ship_coordinates[0][0] for coord in ship_data.ship_coordinates)
        is_vertical = all(coord[1] == ship_data.ship_coordinates[0][1] for coord in ship_data.ship_coordinates)
        if not (is_horizontal or is_vertical):
            return False

    return True
