from datetime import datetime

from app.database.db_setup import Base
from sqlalchemy import Column, DateTime, Integer, String


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)  # Store hashed passwords
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
