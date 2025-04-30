from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.db_setup import Base


class Board(Base):
    __tablename__ = "boards"

    board_id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.game_id"))
    player_id = Column(Integer, ForeignKey("users.user_id"))
    board_state = Column(JSON)
    board_status = Column(String, default="open")

    game = relationship("Game", back_populates="boards")
    ships = relationship("Ship", back_populates="board")
    player = relationship("User")