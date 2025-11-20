import logging
import os

from app.api.routes import auth, boards, bot_routes, csrf_route, games, ships, users
from app.database.db_setup import Base, get_engine
from app.middleware.csrf import CSRFProtectionMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

engine = get_engine()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Multiplayer Battleship")

# Setup logging with detailed format for security audit trail, see #utils/audit_logger.py
log_file = os.getenv("LOG_FILE", "logs/app.log")
os.makedirs(os.path.dirname(log_file), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_file),  # Write to file
        logging.StreamHandler(),  # Also print to console
    ],
)
logger = logging.getLogger(__name__)

# Security: CSRF Protection using Double-Submit Cookie pattern
# This protects against Cross-Site Request Forgery attacks
# see #middleware/csrf.py
app.add_middleware(CSRFProtectionMiddleware)

# Configure CORS
# Only allow requests from trusted frontend origins
origins = ["http://localhost:3000", "https://localhost:3000"]
origins_env = os.getenv("ALLOWED_ORIGINS")
if origins_env:
    origins.extend([origin.strip() for origin in origins_env.split(",")])

logger.info(f"Configured CORS origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
    max_age=600,  # Cache preflight for 10 minutes
)

# Configure Trusted Hosts
allowed_hosts = ["localhost", "127.0.0.1", "*.onrender.com", "testclient"]  # Allow Render + TestClient
allowed_hosts_env = os.getenv("ALLOWED_HOSTS")
if allowed_hosts_env:
    allowed_hosts.extend([host.strip() for host in allowed_hosts_env.split(",")])

logger.info(f"Configured ALLOWED_HOSTS: {allowed_hosts}")

# Only allow requests from trusted hosts
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)


# Add security headers, instruct browsers to use security features
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Prevent MIME type sniffing (e.g., treating CSS as JavaScript)
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Prevent clickjacking attacks - disallow framing in iframes
        response.headers["X-Frame-Options"] = "DENY"
        # Enable XSS protection in older browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Force HTTPS for 1 year (30536000 seconds)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Content Security Policy - prevent inline scripts and external resources
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        )
        # Prevent referrer leakage
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Feature policy - disable unnecessary features
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.include_router(csrf_route.router, prefix="/api", tags=["csrf"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(games.router, prefix="/games", tags=["games"])
app.include_router(boards.router, prefix="/boards", tags=["boards"])
app.include_router(ships.router, prefix="/ships", tags=["ships"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(bot_routes.router, prefix="/bot", tags=["bot"])


# Startup event to log configuration
@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("BattleShip V2 Backend Startup")
    logger.info("=" * 60)
    logger.info(f"Environment: {os.getenv('ENV', 'development')}")
    logger.info("CSRF Middleware: ENABLED")
    logger.info(f"CORS Allowed Origins: {origins}")
    logger.info(f"TrustedHost Allowed Hosts: {allowed_hosts}")
    logger.info("Security Headers: ENABLED")
    logger.info("Database: Connected (create_all executed)")
    logger.info("Ready to accept requests at /api/csrf-token")
    logger.info("=" * 60)
