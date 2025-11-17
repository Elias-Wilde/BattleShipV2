from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# public endpoint for CSRF token

class CSRFResponse(BaseModel):
    message: str = "CSRF token initialized"


@router.get("/csrf-token")
def get_csrf_token():
    # frontend reads the anti-csrf-token cookie set by middleware
    # message indicates token was set
    return CSRFResponse(message="CSRF token initialized")
