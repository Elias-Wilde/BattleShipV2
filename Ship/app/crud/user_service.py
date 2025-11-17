from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.db_setup import get_db
from datetime import datetime
from app.crud.auth_service import hash_password, decode_access_token
from app.models.users import User
from fastapi.security import OAuth2PasswordBearer
from app.schemas.users import User as UserSchema, UserCreate
from app.utils.audit_logger import AuditLogger
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# Get current user from JWT token.
# decode and validate token (username in token and user exist), return user object or raise generic error

def get_current_user_from_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        response = decode_access_token(token)
        username = response.get("username")
        if not username:
            logger.warning("Invalid token: username not found in token payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = get_user_by_username(db, username=username)
        if not user:
            logger.warning(f"User not found for username: {username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    except ValueError as e:
        logger.warning(f"Token validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.warning(f"Unexpected token validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Create a new user with validation (email username pw stength)
def create_user(db: Session, user: UserCreate):
    # validate input format
    if not user.username or not user.email or not user.password:
        logger.warning("Empty username, email, or password in user creation")
        return None
    
    # check for duplicate email
    existing_email = db.query(User).filter(func.lower(User.email) == user.email.lower()).first()
    if existing_email:
        logger.warning(f"Registration attempt with existing email: {user.email}")
        AuditLogger.log_security_event(
            event_type="duplicate_email_registration",
            details={"email": user.email}
        )
        return None
    
    # check for duplicate username
    existing_username = db.query(User).filter(func.lower(User.username) == user.username.lower()).first()
    if existing_username:
        logger.warning(f"Registration attempt with existing username: {user.username}")
        AuditLogger.log_security_event(
            event_type="duplicate_username_registration",
            details={"username": user.username}
        )
        return None
    
    try:
        # Create user with hashed password
        db_user = User(
            username=user.username,
            email=user.email,
            password_hash=hash_password(user.password)
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Log successful user creation
        logger.info(f"User created: {user.username} ({user.email})")
        AuditLogger.log_security_event(
            user_id=db_user.user_id,
            event_type="user_registration",
            details={"username": user.username, "email": user.email}
        )
        
        return db_user
    except Exception as e:
        logger.error(f"Database error during user creation: {str(e)}")
        db.rollback()
        return None


def get_user_by_username(db: Session, username: str):
    if not username or len(username) > 50:
        logger.warning(f"Invalid username format in lookup: {username}")
        return None
    return db.query(User).filter(func.lower(User.username) == username.lower()).first()


def get_user_by_id(db: Session, user_id: int):
    if not isinstance(user_id, int) or user_id <= 0:
        logger.warning(f"Invalid user_id: {user_id}")
        return None
    return db.query(User).filter(User.user_id == user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    skip = max(0, skip)
    limit = min(100, limit)  # Cap limit at 100
    return db.query(User).offset(skip).limit(limit).all()


def get_current_user(db: Session, user_id: int):
    if not isinstance(user_id, int) or user_id <= 0:
        logger.warning(f"Invalid user_id in get_current_user: {user_id}")
        return None
    return db.query(User).filter(User.user_id == user_id).first()