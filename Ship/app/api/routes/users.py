from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.schemas.users import User, UserCreate
from app.crud.user_service import create_user, get_user_by_username, get_user_by_id, get_users, get_current_user, get_current_user_from_token
from app.utils.audit_logger import AuditLogger
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_users(user: UserCreate, db: Session = Depends(get_db)):
    try:
         # create new user, username & password validated in crud
        created_user = create_user(db, user)
        
        # handle validation failures
        if created_user is None:
            # Log attempt, dont leak info about what failed
            logger.warning(f"Registration failed for username: {user.username}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, 
                detail="Username or email already registered"
            )
        
        AuditLogger.log_security_event(
            event_type="USER_REGISTRATION",
            severity="info",
            details={"username": user.username, "email": user.email}
        )
        logger.info(f"User created successfully: {user.username}")
        return created_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during user creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration. Please try again."
        )

@router.get("/users/me", response_model=User)
def read_user_me(current_user: User = Depends(get_current_user_from_token)):
    # authenticated route to get own user
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid authentication token"
        )
    
    AuditLogger.log_data_access(
        user_id=current_user.user_id,
        resource_type="user_profile",
        resource_id=current_user.user_id,
        action="READ_OWN_PROFILE"
    )
    return current_user


@router.get("/{user_id}", response_model=User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    # public route, no sensitive info
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )
    return user


@router.get("/", response_model=list[User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # hard limits to prevent abuse
    if limit > 100:
        limit = 100
    if skip > 10000:
        skip = 10000
    
    return get_users(db, skip=skip, limit=limit)