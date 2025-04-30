from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from app.schemas.users import User, UserCreate
from app.crud.user_service import create_user, get_user_by_username, get_user_by_id, get_users, get_current_user, get_current_user_from_token


router = APIRouter()


@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_users(user: UserCreate, db: Session = Depends(get_db)):
    created_user = create_user(db, user)
    if created_user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    return created_user


@router.get("/users/me", response_model=User)
def read_user_me(current_user: User = Depends(get_current_user_from_token)):
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")
    return current_user


@router.get("/{user_id}", response_model=User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("/", response_model=list[User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_users(db, skip=skip, limit=limit)