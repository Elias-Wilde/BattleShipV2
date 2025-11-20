import logging
import os
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from app.utils.audit_logger import AuditLogger
from dotenv import load_dotenv
from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

load_dotenv()

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# track failed login attempts
login_attempts = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = 300  # 5 minutes in seconds


def is_account_locked(username: str) -> bool:
    # anti brute force
    if username not in login_attempts:
        return False

    current_time = time.time()
    # filter out attempts older than lockout duration
    recent_attempts = [
        attempt_time for attempt_time in login_attempts[username] if current_time - attempt_time < LOCKOUT_DURATION
    ]

    login_attempts[username] = recent_attempts
    return len(recent_attempts) >= MAX_LOGIN_ATTEMPTS


def record_failed_attempt(username: str):
    login_attempts[username].append(time.time())
    AuditLogger.log_login_attempt(username, success=False)
    logger.warning(f"Failed login attempt for user: {username}")


def clear_login_attempts(username: str):
    if username in login_attempts:
        del login_attempts[username]


# hash password using bcrypt
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# create jwt token with expiration and user info
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


# decode and validate jwt token
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


def authenticate_user(db: Session, username: str, password: str, ip_address: str = "unknown"):
    # authenticate user with username and pw. (5 failed attemps before lockout)
    # validate input, check if username exists and is not on cooldown, verify password with bcrypt
    import re

    from app.crud.user_service import get_user_by_username

    # Input validation - no injection
    if not username or len(username) < 3 or len(username) > 50:
        AuditLogger.log_authentication_attempt(
            username=username, success=False, reason="invalid_username_format", ip_address=ip_address
        )
        logger.warning(f"Invalid username format from {ip_address}: '{username}'")
        return False

    if not re.match(r"^[a-zA-Z0-9_-]+$", username):
        AuditLogger.log_authentication_attempt(
            username=username, success=False, reason="invalid_username_characters", ip_address=ip_address
        )
        logger.warning(f"Invalid username characters from {ip_address}: '{username}'")
        return False

    if not password or len(password) > 500:
        AuditLogger.log_authentication_attempt(
            username=username, success=False, reason="invalid_password_format", ip_address=ip_address
        )
        logger.warning(f"Invalid password format from {ip_address}")
        return False

    # check if account is locked due to too many failed attempts
    if is_account_locked(username):
        logger.warning(f"Login attempt on locked account: {username} from {ip_address}")
        AuditLogger.log_security_event(
            user_id=None,
            event_type="account_locked",
            details={"username": username, "ip_address": ip_address, "reason": "rate_limit"},
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Account locked for 5 minutes.",
        )

    user = get_user_by_username(db, username=username)

    if not user:
        record_failed_attempt(username)
        AuditLogger.log_authentication_attempt(
            username=username, success=False, reason="user_not_found", ip_address=ip_address
        )
        logger.warning(f"Failed login attempt (user not found): {username} from {ip_address}")
        return False

    # use bcrypt to compare passwords
    if not verify_password(password, user.password_hash):
        record_failed_attempt(username)
        AuditLogger.log_authentication_attempt(
            username=username, success=False, reason="invalid_password", ip_address=ip_address, user_id=user.user_id
        )
        logger.warning(f"Failed login attempt (wrong password): {username} from {ip_address}")
        return False

    # on success clear failed attempts
    clear_login_attempts(username)
    AuditLogger.log_authentication_attempt(
        username=username, success=True, reason="valid_credentials", ip_address=ip_address, user_id=user.user_id
    )
    logger.info(f"User authenticated successfully: {username} from {ip_address}")
    return user
