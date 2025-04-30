from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database.db_setup import Base


class Ship(Base):
    __tablename__ = "ships"

    ship_id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.board_id"))
    ship_type = Column(String)
    ship_coordinates = Column(JSON)
    ship_hits = Column(JSON, default=[])

    board = relationship("Board", back_populates="ships")