# CSRF Protection Middleware
# Implements Double-Submit Cookie pattern for CSRF protection

import secrets
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.requests import Request

logger = logging.getLogger(__name__)

CSRF_TOKEN_LENGTH = 32
CSRF_COOKIE_NAME = "csrf-token"
CSRF_HEADER_NAME = "X-CSRF-Token"

# Methods that require CSRF protection (state-changing operations)
CSRF_PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

# double sumit cookie pattern
# generate token on Get requests, set in cookie
# client reads cookie and sends in header on future requests
# on protected methods validate token from header matches cookie value

# sameSite=strict to prevent cross-site requests

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    
    async def dispatch(self, request: Request, call_next):
        # Generate CSRF token on GET requests
        if request.method == "GET":
            # if token is set
            csrf_token = request.cookies.get(CSRF_COOKIE_NAME)
            if not csrf_token:
                # generate new token
                csrf_token = secrets.token_hex(CSRF_TOKEN_LENGTH // 2)
                logger.info(f"Generated new CSRF token for {request.url.path}")
            
            response = await call_next(request)
            
            # Set CSRF token in cookie (NOT httpOnly, client needs to read)
            # client must have access to token for double submit pattern
            response.set_cookie(
                CSRF_COOKIE_NAME,
                csrf_token,
                httponly=False,  # Must be False
                secure=False,  # in production should be True
                samesite="lax",  # same-site form submissions allowed
                max_age=3600,  # 1 hour
                path="/"
            )
            return response
        
        # Validate CSRF token on protected methods
        if request.method in CSRF_PROTECTED_METHODS:
            csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
            csrf_header = request.headers.get(CSRF_HEADER_NAME)
            
            logger.warning(
                f"CSRF validation for {request.method} {request.url.path}: "
                f"cookie_present={bool(csrf_cookie)}, header_present={bool(csrf_header)}"
            )
            
            if csrf_cookie:
                logger.warning(f"  Cookie value: {csrf_cookie[:16]}...")
            if csrf_header:
                logger.warning(f"  Header value: {csrf_header[:16]}...")
            
            # Both token and header must exist
            if not csrf_cookie:
                logger.warning(
                    f"CSRF: Missing cookie for {request.method} {request.url.path}"
                )
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF token missing in cookie"}
                )
            
            if not csrf_header:
                logger.warning(
                    f"CSRF: Missing header for {request.method} {request.url.path}"
                )
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF token missing in header"}
                )
            
            # Validate tokens match (cookie and header)
            if csrf_cookie != csrf_header:
                logger.warning(
                    f"CSRF: Token mismatch for {request.method} {request.url.path} "
                    f"(cookie={csrf_cookie[:16]}..., header={csrf_header[:16]}...)"
                )
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF token validation failed"}
                )
            
            logger.info(f"CSRF: Valid token for {request.method} {request.url.path}")
        
        response = await call_next(request)
        return response
