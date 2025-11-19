from fastapi import APIRouter
from pydantic import BaseModel
from starlette.responses import Response

router = APIRouter()

# public endpoint for CSRF token

class CSRFResponse(BaseModel):
    message: str = "CSRF token initialized"


@router.get("/csrf-token")
def get_csrf_token():
    # frontend reads the anti-csrf-token cookie set by middleware
    # message indicates token was set
    return CSRFResponse(message="CSRF token initialized")


@router.options("/csrf-token")
def csrf_token_options():
    # Handle CORS preflight requests
    return Response(status_code=200)
