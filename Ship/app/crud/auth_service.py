from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from app.schemas.users import User
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from passlib.context import CryptContext
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, user_id: int, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "user_id": user_id})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    logger.info(f"Access token created for user_id: {user_id}, expires at: {expire}")
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id = payload.get("user_id")
        if username is None or user_id is None:
            logger.warning("Invalid token payload: missing username or user_id")
            raise ValueError("Invalid token payload")
        return {"username": username, "user_id": user_id}
    except JWTError as e:
        logger.warning(f"Token decoding error: {e}")
        raise ValueError(f"Token decoding error: {e}")


def authenticate_user(db: Session, username: str, password: str):
    from app.crud.user_service import get_user_by_username # Import here to avoid circular import
    user = get_user_by_username(db, username=username)

    if not user:
        logger.warning(f"Failed login attempt: user not found - {username}")
        return False
    
    if not verify_password(password, user.password_hash):
        logger.warning(f"Failed login attempt: wrong password - {username}")
        return False
    
    logger.info(f"User authenticated successfully: {username}")
    return user