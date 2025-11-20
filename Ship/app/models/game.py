from datetime import datetime, timezone

from app.database.db_setup import Base
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class Game(Base):
    __tablename__ = "games"

    game_id = Column(Integer, primary_key=True, index=True)
    player1_id = Column(Integer, ForeignKey("users.user_id"))
    player2_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    turn = Column(Integer, nullable=True)
    game_status = Column(String)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    winner_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    boards = relationship("Board", back_populates="game")
    player1 = relationship("User", foreign_keys=[player1_id])
    player2 = relationship("User", foreign_keys=[player2_id])


class GameCreate(BaseModel):
    player1_id: int
    game_status: str
