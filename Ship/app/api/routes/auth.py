from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.db_setup import get_db
from fastapi.security import OAuth2PasswordRequestForm
from app.crud.auth_service import authenticate_user, create_access_token
from app.schemas.token import TokenResponse
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# login route returns jwt token
@router.post("/login", response_model=TokenResponse)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None
):

    user = authenticate_user(
        db,
        form_data.username,
        form_data.password,
        ip_address=request.client.host if request else "unknown" #todo ip tracking
    )

    if not user:
        # error message prevents user enumeration attacks
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username},
        user_id=user.user_id
    )

    return {"access_token": access_token, "token_type": "bearer"}