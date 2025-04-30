from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import func, cast
from app.database.db_setup import get_db
from datetime import datetime
from typing import List
from app.crud.auth_service import hash_password
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.users import User
from app.models.game import Game
from app.models.board import Board
from app.models.ship import Ship
from fastapi.security import OAuth2PasswordBearer
from app.crud.auth_service import decode_access_token

from app.schemas.users import User as UserSchema, UserCreate
from app.schemas.game import Game as GameSchema
from app.schemas.board import Board as BoardSchema, BoardCreate
from app.schemas.ship import Ship as ShipCreate


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")  # Fixed tokenUrl

def get_current_user_from_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        response = decode_access_token(token)
        username = response.get("username")
        user = get_user_by_username(db, username=username)
        return user # returns none if user not found
    except Exception as e:
        return None


def create_user(db: Session, user: UserCreate):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_by_username(db:Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db:Session, user_id: int):
    return db.query(User).filter(User.user_id== user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()


def get_current_user(db: Session, user_id: int):
    return db.query(User).filter(User.user_id == user_id).first()