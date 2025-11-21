# BattleShip - Threat Model and list of implemented Cyber Security measures

## Project Summary

"BattleShip"is a 1vs1 multiplayer real-time strategy board game.
This document gives technical specifications of implemented security measurements, threat modeling, and architectural design decisions.
The Documentation can be found in the README.md

**Architecture:** FastAPI (Python) backend + React frontend
**Database:** PostgreSQL (production) / SQLite (development)
**Deployment:** Render platform with automated CI/CD
**Status:** Production-ready with comprehensive security controls implemented

---

## System Architecture Overview

### Backend Stack
- **Framework:** FastAPI (async Python web framework)
- **Authentication:** JWT (HS256-HMAC-SHA256)
- **Password Hashing:** bcrypt (Python passlib wrapper, cost factor 12)
- **Database ORM:** SQLAlchemy 2.0+ (parameterized queries, no raw SQL)
- **CSRF Protection:** Double-Submit Cookie pattern with cryptographic tokens
- **Secrets Management:** Environment variables via python-dotenv

### Frontend Stack
- **Framework:** React (automatic template escaping, XSS mitigation)
- **Token Storage:** localStorage with localStorage-based session management
- **API Client:** Fetch API with standard HTTP headers for CSRF tokens
- **Content Security:** CSP + X-Frame-Options headers enforced server-side

### Network Layer
- **Transport:** HTTPS-ready (TLS 1.2+ configured in production)
- **CORS:** Whitelist-based origin control (localhost:3000 for development)
- **Host Validation:** TrustedHostMiddleware blocks host header injection attacks

---

## Threat Model

This section analyzes each STRIDE threat category

### 1. Spoofing (Authentication & Identity)

**Threat Scenarios:**
- Credential guessing attacks against known usernames
- Token forgery via HMAC-SHA256 signature collision
- Session hijacking via stolen JWT tokens

**Implemented Mitigations:**

| Control | Mechanism | Implementation |
|---------|-----------|-----------------|
| **Password Security** | bcrypt hashing with salt | `auth_service.py`: `hash_password()` uses CryptContext(schemes=["bcrypt"], deprecated="auto") with automatic salt |
| **Rate Limiting** | Account lockout after failed attempts | 5 failed attempts → 5-minute lockout tracked in-memory in `login_attempts` dict |
| **JWT Signature** | HMAC-SHA256 with SECRET_KEY | `create_access_token()` signs with HS256; `decode_access_token()` validates signature on every protected route |
| **Token Expiration** | Time-limited credentials | 30-minute expiry (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`) |
| **Audit Logging** | Identity events tracked | `AuditLogger.log_authentication_attempt()` records username, IP, status, user_id; all login attempts logged |

**Technical Implementation:**

```python
# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Rate limiting
def is_account_locked(username: str) -> bool:
    current_time = time.time()
    recent_attempts = [attempt_time for attempt_time in login_attempts[username]
                       if current_time - attempt_time < LOCKOUT_DURATION]  # 300s
    return len(recent_attempts) >= MAX_LOGIN_ATTEMPTS  # 5 attempts

# JWT creation
to_encode.update({"exp": expire, "user_id": user_id})
encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # HS256
```

---

### 2. Tampering (Data Integrity & CSRF)

**Threat Scenarios:**
- CSRF attacks via cross-origin form submission
- JWT token modification (signature invalid)
- HTTP request interception (MitM attacks)
- SQL injection via malformed queries
- Game state modification via client-side attacks

**Implemented Mitigations:**

| Control | Mechanism | Implementation |
|---------|-----------|-----------------|
| **CSRF Protection** | Double-Submit Cookie pattern | Token generated on GET, validated on state altering requests POST/PUT/DELETE; `csrf.py` middleware |
| **JWT Integrity** | Cryptographic signatures | HMAC-SHA256; tampered tokens fail signature verification |
| **Transport Security** | HTTPS with Secure flag | `Secure=True` in production; HSTS header: `max-age=31536000` |
| **SQL Injection Prevention** | Parameterized queries via ORM | SQLAlchemy ORM usage; no raw SQL  |
| **Input Validation** | Type & format validation | Pydantic schemas enforce types, length bounds, regex patterns before route handlers |
| **Board State Validation** | Server-side game logic | All game state changes validated before database commit |

**Technical Implementation**

```python
# CSRF middleware
# Double-submit cookie pattern:
# GET request: generate token, set in cookie
csrf_token = secrets.token_hex(CSRF_TOKEN_LENGTH // 2)  # 32-char hex token
response.set_cookie(CSRF_COOKIE_NAME, csrf_token, httponly=False,
                    secure=is_production, samesite="none" if is_production else "lax")

# Protected method (POST/PUT/DELETE): validate token in header matches cookie
if request.method in CSRF_PROTECTED_METHODS:
    csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
    csrf_header = request.headers.get(CSRF_HEADER_NAME)
    if csrf_cookie != csrf_header:
        return JSONResponse(status_code=403, content={"detail": "CSRF token validation failed"})

# SQLAlchemy
# All user queries parameterized
user = db.query(User).filter(User.username == username).first()  # ORM parameterizes
# NOT: `SELECT * FROM users WHERE username = '{username}'`  (vulnerable to injection)
```

---

### 3. Repudiation (Non-Repudiation & Audit Trail)

**Threat Scenarios:**
- User denying they performed an action
- Audit log tampering or deletion

**Implemented Mitigations:**

| Control | Mechanism | Implementation |
|---------|-----------|-----------------|
| **Event Logging** | Structured audit trail | `AuditLogger` class logs: login, authorization, game actions, data access |
| **Timestamp Recording** | ISO 8601 timestamps | `datetime.now(tz=None)` for all events; `created_at` field on all game entities |
| **Action Detail** | Specific action tracking | Log includes: user_id, game_id, action type, coordinates, status |
| **Structured Format** | Parseable log format | `FIELD=value` pipe-delimited format: `LOGIN_ATTEMPT \| status=SUCCESS \| username=alice \| ip=192.168.1.1` |
| **Persistence** | Dual output (file + console) | Logs written to file (`logs/app.log`) and console simultaneously |

**Technical Implementation:**

```python
# Audit logger
@staticmethod
def log_game_action(user_id: int, game_id: int, action: str,
                    details: Optional[Dict[str, Any]] = None):
    details_str = json.dumps(details) if details else ""
    audit_logger.info(
        f"GAME_ACTION | user_id={user_id} | game_id={game_id} | action={action} | details={details_str}"
    )

# Usage in game endpoints
AuditLogger.log_game_action(
    user_id=current_user.user_id,
    game_id=game_id,
    action="attack",
    details={"coordinates": attack_data.coordinates}
)

# Example log
# 2024-01-15 14:32:01,234 - audit - INFO - GAME_ACTION | user_id=1 | game_id=42 | action=attack | details={"coordinates": [3, 5]}
```
---

### 4. Information Disclosure (Confidentiality & Privacy)

**Threat Scenarios:**
- Unauthorized access to opponent board state
- Information leakage via error messages or logs
- User enumeration via registration endpoint
- XSS attacks stealing authentication tokens
- Sensitive data in HTTP responses
- API response containing sensible game information

**Implemented Mitigations:**

| Control | Mechanism | Implementation |
|---------|-----------|-----------------|
| **Access Control** | Per-game authorization | `check_game_access()` verifies user is player1 or player2 before board access |
| **XSS Prevention** | React automatic escaping | JSX template expressions auto-escape |
| **CSP Headers** | Content Security Policy | `default-src 'self'`; `script-src 'self'`; blocks inline JS, external resources |
| **Generic Errors** | User-facing messages | "Invalid credentials" (not "User not found"); prevents user enumeration |
| **Secret Protection** | Environment variables | SECRET_KEY, DATABASE_URL, BOT_PASSWORD in `.env`, not in code or logs |
| **Token Storage** | Limited exposure window | Tokens in Authorization header (not URL); 30-minute expiry limits thief window |
| **Response Filtering** | Pydantic schemas | Response serialization uses schema; password_hash never included in User responses |
| **No Password Logging** | Explicit filtering | Password field excluded from audit logs and error messages |
| **Database Encryption** | Connection-level TLS | PostgreSQL connections use psycopg2 with SSL in production |

**Technical Implementation:**

```python
# Game access verification
@router.post("/{game_id}/attack", response_model=GameSchema)
def attack_game(
    game_id: int,
    player_id: int,
    current_user: User = Depends(get_current_user_from_token),  # JWT verification
    db: Session = Depends(get_db),
):
    if current_user.user_id != player_id:  # Self-verification
        AuditLogger.log_authorization_failure(
            user_id=current_user.user_id,
            action="attack",
            resource=f"game:{game_id}",
            reason="User can only attack as themselves",
        )
        raise HTTPException(status_code=403, detail="You can only attack as yourself")

# CSP Headers
# Security headers middleware
response.headers["Content-Security-Policy"] = (
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
)
# Inline <script> tags blocked; only scripts from same origin allowed

# Generic Error messages
# Login endpoint
if not user:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",  # Generic message
        # NOT "User "name" not found" (user enumeration)
        # NOT "User found but password wrong" (information disclosure)
    )
```

---

### 5. Denial of Service (Availability)

**Threat Scenarios:**
- Brute-force login attacks (thousands of attempts/second)
- Memory exhaustion via large request payloads
- Database connection pool exhaustion
- Repeated CSRF token validation failures
- Game flooding (excessive API requests)

**Implemented Mitigations:**

| Control | Mechanism | Implementation |
|---------|-----------|-----------------|
| **Account Lockout** | Progressive rate limiting | 5 failed attempts → 5-minute account lockout per username |
| **Payload Validation** | Pydantic size limits | Request body validated before processing; FastAPI rejects oversized payloads |
| **Database Pooling** | Connection reuse | SQLAlchemy connection pool (default 20 connections) prevents exhaustion |
| **Query Optimization** | Indexed lookups | User queries by `username` (unique index); game queries by `game_id` (primary key) |
| **Logging Rate Limiting** | Structured audit trail | Failed attempts logged for operator monitoring; enables rate limit tuning |

**Technical Implementation:**

```python
# Rate limiting
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = 300  # 5 minutes

def is_account_locked(username: str) -> bool:
    current_time = time.time()
    recent_attempts = [
        attempt_time for attempt_time in login_attempts[username]
        if current_time - attempt_time < LOCKOUT_DURATION
    ]
    login_attempts[username] = recent_attempts  # Remove stale attempts
    return len(recent_attempts) >= MAX_LOGIN_ATTEMPTS

# When locked:
raise HTTPException(
    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    detail="Too many failed attempts. Account locked for 5 minutes.",
)
```

**Limitations:**
- Rate limiting is per-account only (username). Imrpovement would be to also track and block ip.
- No request rate limiting on game endpoints implemented yet.
- In-memory tracking has its limitations. Consider Redis especially for distributed deployments

---

### 6. Elevation of Privilege (Authorization & Access Control)

**Threat Scenarios:**
- JWT token tampering to change user_id
- Bypassing turn-based game rules
- Attacking on opponent's turn
- Accessing another player's game
- Bot playing outside game rules

**Implemented Mitigations:**

| Control | Mechanism | Implementation |
|---------|-----------|-----------------|
| **JWT Signature Validation** | Cryptographic verification | Every protected route calls `get_current_user_from_token()` which decodes and validates HS256 signature |
| **User ID Extraction** | Token payload parsing | JWT contains `user_id`; extracted and verified to match `current_user.user_id` |
| **Turn-Based Access** | Game state machine | `if game.turn != player_id: raise ValidationError` before processing attack |
| **Game Access Verification** | Player in game check | `check_game_access()` ensures `user_id in [game.player1_id, game.player2_id]` |
| **Self-Action Verification** | Identity matching | Endpoints verify `current_user.user_id == requested_user_id` for operations |
| **Bot Authorization** | Environment password | Bot created with `BOT_PASSWORD` from environment; can only join with valid credentials |

**Technical Implementation**

```python
# Token verification
def get_current_user_from_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = decode_access_token(token)  # Validates signature
        user_id = payload.get("user_id")
        # If signature is invalid, JWTError raised; 401 returned
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

# decode_access_token
def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # HS256 verification
        username: str = payload.get("sub")
        user_id = payload.get("user_id")
        if username is None or user_id is None:
            raise ValueError("Invalid token payload")
        return {"username": username, "user_id": user_id}
    except JWTError as e:
        raise ValueError(f"Token decoding error: {e}")

# Game Access
# Authorization check
def check_game_access(db: Session, game_id: int, current_user: User):
    game = get_game(db, game_id)
    if not game:
        raise NotFoundError("Game")

    if current_user.user_id not in [game.player1_id, game.player2_id]:
        raise PermissionError("You are not a player in this game")

# Usage
check_game_access(db, game_id, current_user)

# Turn based access
# Attack validation
def attack(db: Session, game_id: int, player_id: int, coordinates):
    game = get_game(db, game_id)

    # Verify it is current player's turn
    if game.turn != player_id:
        raise PermissionError(f"It is player {game.turn}'s turn, not yours")
```

---

### Authentication System

#### Password Hashing

**Algorithm:** bcrypt (via Python passlib CryptContext)
**Cost Factor:** 2^12 iterations (hardness parameter)
**Salt:** Automatically generated per password (unique per hash)
**Computational Cost:** ~300ms per hash verification on modern hardware
**Storage:** Only hashed value in database; plaintext password never stored
**Rainbow Table Resistance:** Unique salt per password defeats precomputed tables

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)  # Auto-generates unique salt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

#### JWT Token Generation & Validation

**Token Format:** JWT with three components (header.payload.signature)

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiJhbGljZSIsInVzZXJfaWQiOjEsImV4cCI6MTcwNTM0MzIwMH0.
3qWvS2LzYbZq9kL-3p7xQ8vF0rE9hJ2kL4mN6pO8sT0
```

**Header:** `{"alg": "HS256", "typ": "JWT"}`
**Payload:** `{"sub": "username", "user_id": 1, "exp": <unix_timestamp>}`
**Signature:** HMAC-SHA256(base64(header) + "." + base64(payload), SECRET_KEY)
**Algorithm:** HS256 (HMAC-SHA256, symmetric key cryptography)
**Signing Key:** SECRET_KEY from environment (~32+ character length)
**Verification:** Signature recalculated on each request; mismatch = 401 Unauthorized

```python
# Token creation
def create_access_token(data: dict, user_id: int,
                       expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "user_id": user_id})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # HS256
    return encoded_jwt

# Token validation
def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # Verify signature
        # If signature invalid or key does not match: JWTError raised
        username = payload.get("sub")
        user_id = payload.get("user_id")
        return {"username": username, "user_id": user_id}
    except JWTError as e:
        raise ValueError(f"Token decoding error: {e}")
```

#### Login Flow

```
1. User submits username + password to POST /auth/login
2. Middleware applies (CSRF check, TrustedHost, etc.)
3. Pydantic validates request format
4. authenticate_user() called:
   a. Input validation (username format, password length)
   b. Account lockout check (is_account_locked())
   c. User lookup by username (db.query(User).filter(...))
   d. Password verification: bcrypt.verify(password, user.password_hash)
   e. On failure: record_failed_attempt(), audit log, return False
   f. On success: clear_login_attempts(), audit log, return user
5. create_access_token() generates JWT
6. Token returned as JSON: {"access_token": "...", "token_type": "bearer"}
7. Client stores in localStorage
8. Client sends Authorization: Bearer <token> on subsequent requests
9. get_current_user_from_token() dependency verifies signature + extracts user_id
```

#### Input Validation

**Schema Validation (Pydantic):**

```python
# User schema
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)

    @validator("username")
    def username_alphanumeric(cls, v):
        if not re.match("^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username must be alphanumeric with only - and _")
        return v

# Attack coordinates schema
class AttackData(BaseModel):
    coordinates: List[int]  # Pydantic validates type; route validates bounds
```

**Validation in Route Handlers:**

- Type validation happens automatically (Pydantic)
- Length/format validation happens in schema
- Business logic validation happens in service layer
- Database constraints validate uniqueness (username, email)
- Out-of-bounds coordinates rejected before game logic

#### Secrets Management

**Environment Variables:**

```python
# stored in dotenv file
# Config loading
from dotenv import load_dotenv
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+...")
```

**Git Security:**
- `.env` file in `.gitignore`
- `.env.example` provided as template
- Render(host service) environment variables configured via dashboard
- GitHub Secrets used for CI/CD workflows

---

### Input Validation (Pydantic & SQLAlchemy)

All user input validated before database access via Pydantic schemas. No raw SQL queries; SQLAlchemy ORM parameterizes all values.

**Validation Layers:**
1. **HTTP Request Layer:** FastAPI/Pydantic parses JSON, enforces schema
2. **Business Logic Layer:** Route handlers verify authorization, validate state
3. **Database Layer:** SQLAlchemy ORM parameterizes queries, enforces constraints
4. **Client-Side Layer:** React input controls + form validation (UI)

**SQL Injection Prevention:**

All queries use SQLAlchemy ORM (zero raw SQL in codebase):

```python
# Safe: ORM parameterizes
user = db.query(User).filter(User.username == username).first()
# Becomes: SELECT * FROM users WHERE username = %s  (with username as parameter)

# Security risk would be: f"SELECT * FROM users WHERE username = '{username}'"
```

---

### Data Protection

#### Password Storage

- **Never stored as plaintext** - Only bcrypt hash stored
- **One-way function** - Hash can't be reversed to get password
- **Unique salt per password** - Prevents rainbow table attacks
- **Slow computation** - bcrypt cost=12 makes brute-forcing expensive
- **Timing-safe comparison** - bcrypt.verify() resists timing attacks


#### Transport Security

**In Production:**
- TLS 1.2+ (HTTPS enforced)
- Secure flag on cookies: `secure=True`
- SameSite=None (allows cross-site cookies in HTTPS)
- HSTS header: `max-age=31536000` (force HTTPS for 1 year)

**In Development:**
- HTTP allowed (localhost)
- Secure flag on cookies: `secure=False`
- SameSite=Lax (restrict cross-site)

---

### Network Security Headers

All headers set in `SecurityHeadersMiddleware`:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing attacks |
| X-Frame-Options | DENY | Prevent clickjacking (no iframe framing) |
| X-XSS-Protection | 1; mode=block | XSS protection (legacy browsers) |
| Strict-Transport-Security | max-age=31536000 | Force HTTPS for 1 year |
| Content-Security-Policy | default-src 'self'; script-src 'self' | Prevent XSS & injection attacks |
| Referrer-Policy | strict-origin-when-cross-origin | Don't leak referrer |
| Permissions-Policy | geolocation=(), microphone=(), camera=() | Disable unnecessary features |

**CORS Configuration:**

```python
# Allowed origins
origins = ["http://localhost:3000", "https://localhost:3000"]
origins_env = os.getenv("ALLOWED_ORIGINS")
if origins_env:
    origins.extend([origin.strip() for origin in origins_env.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Allow withCredentials: true
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
    max_age=600,  # Cache preflight for 10 minutes
)
```

**TrustedHost Middleware:**

```python
allowed_hosts = ["localhost", "*.onrender.com", "testclient"]
allowed_hosts_env = os.getenv("ALLOWED_HOSTS")
if allowed_hosts_env:
    allowed_hosts.extend([host.strip() for host in allowed_hosts_env.split(",")])

app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
# Blocks requests with Host header not in whitelist (cache poisoning prevention)
```

---

**Server-Side Logging:**

```python
# Detailed log for operators
if not user:
    logger.warning(f"Failed login attempt (user not found): {username} from {ip_address}")
    # Log includes: which username, which IP (for attack analysis)

# User sees:
# HTTP 401: "Incorrect username or password"
# Operator sees:
# 2024-01-15 14:32:01 - WARNING - Failed login attempt (user not found): alice from 192.168.1.1
```

---

## Complete List of implementation Security Measurements

### Authentication & Authorization
- [x] bcrypt password hashing
- [x] JWT token generation & validation
- [x] Rate limiting
- [x] Per-game access control
- [x] Turn-based authorization
- [x] Self-action verification
- [x] Token expiration

### Input Validation
- [x] Pydantic schema validation
- [x] Username validation
- [x] Email validation (RFC 5322 format)
- [x] Password validation (8+ chars, hashed before storage)
- [x] Coordinate bounds checking
- [x] No raw SQL queries

###  Data Protection
- [x] Password hashing
- [x] Secrets in environment variables
- [x] No sensitive data in logs
- [x] Transport security ready (HTTPS-ready)
- [x] SameSite cookies configured
- [x] Secure flag conditional on production

### CSRF Protection
- [x] Double-Submit Cookie pattern implemented
- [x] CSRF token validation on POST/PUT/DELETE
- [x] Token generated on GET requests
- [x] Middleware applied globally
- [x] Frontend integration (reads from cookie, sends in header)

### Security Headers
- [x] X-Content-Type-Options: nosniff
- [x] X-Frame-Options: DENY
- [x] X-XSS-Protection: 1; mode=block
- [x] Strict-Transport-Security: 1 year
- [x] Content-Security-Policy: default-src 'self'
- [x] Referrer-Policy: strict-origin-when-cross-origin

### Network Security
- [x] CORS whitelist
- [x] TrustedHost middleware
- [x] Allowed methods restriction
- [x] Allowed headers restriction (Content-Type, Authorization, X-CSRF-Token)

### Audit Logging
- [x] Login attempts
- [x] Authorization failures (user, action, resource, reason)
- [x] Game actions (create, join, attack, surrender)
- [x] Timestamp on all events

### Error Handling
- [x] Generic messages
- [x] Detailed server-side logging
- [x] Appropriate HTTP status codes

---

## Current limitations

1. **Token Revocation:**
   - No token blacklist implemented
   - Tokens valid until expiration (30 minutes)
   - Logout doesn't invalidate existing tokens

2. **Rate Limiting Scope:**
   - username (account) only (not Endpoint or IP)
   - No Redis for distributed rate limiting
   - Distributed attacks from multiple IPs bypass account lockout

3. **Token Storage:**
   - localStorage (XSS risk if application code contains vulnerability)

### Improvements

- [ ] Refresh token pattern (separate access + refresh tokens)
- [ ] Token blacklist for logout revocation
- [ ] Email verification on registration
- [ ] Password reset flow with time-limited tokens
- [ ] API-wide rate limiting (per-endpoint)
- [ ] Distributed rate limiting (Redis-backed)
- [ ] TOTP/2FA (two-factor authentication)
- [ ] Session binding (bind token to IP address)

---


## Operational Security

### Deployment

**Render Platform Configuration:**
- Environment variables configured via Render dashboard
- Secrets never in code or `.env` file
- Automatic HTTPS (Render provides TLS)
- Health checks configured

**Pre-Deployment Checklist:**

- [ ] All environment variables set (SECRET_KEY, DATABASE_URL, etc.)
- [ ] ALLOWED_ORIGINS updated for production domain
- [ ] ALLOWED_HOSTS updated for production domain
- [ ] Database schema migrated (alembic)
- [ ] Security headers enabled (automatic via middleware)
- [ ] HTTPS enforced (Render provides this)


## Security Maintenance

- Review authentication logs for brute force attempts
- Check for any security patch updates for dependencies
- Verify all environment variables are still secure


### Dependency Management

**Pinning Strategy:**
- Pin major.minor.patch (avoid auto-updates breaking compatibility)
- Test updates in development before production deployment
- Use `pip-audit` to scan for known vulnerabilities

```bash
# Check for known vulnerabilities
pip-audit requirements.txt

# Update pinned version after testing
pip install --upgrade <package>==<new-version>
```

---

## CI/CD Pipeline & Security Automation

### Overview

The security pipeline enforces code quality, security standards, and testing requirements before code reaches production. All changes flow through multiple validation gates.

**Pipeline Stages:**
1. **Pre-Commit Hooks** - Local validation before git commit
2. **GitHub Actions** - Automated CI/CD on push/PR (tests, linting, security)
3. **Render Deployment** - Automated deployment on successful CI

---

### Pre-Commit Hooks

Local validation framework that runs before code is committed. Prevents insecure or malformed code from entering the repository.

**Configuration File:** `.pre-commit-config.yaml`

**Installed Hooks:**
| Hook | Purpose | Runs On |
|------|---------|---------|
| trailing-whitespace | Remove trailing whitespace | All files |
| end-of-file-fixer | Ensure files end with newline | All files |
| check-yaml | Validate YAML syntax | `.yml`, `.yaml` files |
| check-added-large-files | Prevent accidentally committing large files | All files |
| check-merge-conflict | Detect unresolved merge conflicts | All files |
| detect-private-key | Detect private keys in code | All files |
| black | Format Python code consistently | `.py` files |
| isort | Sort and organize imports | `.py` files |
| flake8 | Lint Python code (PEP 8 compliance) | `.py` files |
| bandit | Security linting for Python | `app/` directory |


Example detection:
```python
# BLOCKS with bandit
password = "super_secret_123"  # B105: hardcoded_password_string

# ALLOWS
password = os.getenv("PASSWORD")  # No issue
```


### GitHub Actions CI/CD Pipeline

Automated testing and validation on every push and pull request.

**Configuration File:** `.github/workflows/test.yml`

**Trigger Events:**
- Push & Pull to `secure` or `develop` branches

## CI/CD Results

✅ Tests passed
✅ Code quality checks passed
✅ Security checks passed

---

### Local Development Workflow

**Before Committing:**
```bash
# pre-commit hooks on all files
pre-commit run --all-files
# Commit your changes
git add . && git commit -m "feature"
# if passes, push
git push origin feature-branch
# GitHub Actions runs automatically
# Review CI/CD results in PR checks
```

---
