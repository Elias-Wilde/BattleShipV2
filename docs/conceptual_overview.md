# Conceptual Overview

This document explains the high-level architecture, design decisions, and game mechanics of this BattleShip game applicaton.

---

## Game Rules

**BattleShip** is a turn-based ship combat game between two players:

1. **Setup Phase**
   - Each player receives a 10×10 grid board
   - Each player places 5 ships on their board:
     - **Carrier** (5 squares)
     - **Battleship** (4 squares)
     - **Cruiser** (3 squares)
     - **Submarine** (3 squares)
     - **Destroyer** (2 squares)
   - Ships must not overlap
   - Ships can be placed horizontally or vertically

2. **Combat Phase**
   - Players alternate turns (Player 1 goes first)
   - On each turn, a player attacks one coordinate on the opponent's board
   - Attack results:
     - **Hit** (red) - Opponent has a ship at that location
     - **Miss** (yellow) - No ship at that location
   - The attacker's board shows their own ships and previous attack results
   - The defender's board shows only hits and misses (ship locations hidden until hit)

3. **Winning**
   - First player to hit all squares of all 5 opponent ships wins
   - A player can also surrender to concede the game immediately
   - Game tracks winner and end time

---

## System Architecture

### High-Level Overview

```
┌─────────────────┐                    ┌──────────────────┐
│   React SPA     │                    │   FastAPI        │
│   Frontend      │◄──────HTTP/REST───►│   Backend        │
│  (Port 3000)    │                    │  (Port 8000)     │
└─────────────────┘                    └──────────────────┘
       │                                       │
       │ Stores JWT                           │
       │ in localStorage                      │ Validates JWT
       │                                      │ on every request
       └──────────────┬───────────────────────┘
                      │
                  ┌───▼────┐
                  │Database │
                  │(SQLite/ │
                  │Postgres)│
                  └────────┘
```

### Backend Architecture

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────────────────┐
│         FastAPI Router Layer                        │
│  /auth    /users    /games    /boards    /ships     │
└─────────────────────────────────────────────────────┘
    │
    ▼ (validate path params, auth token)
┌─────────────────────────────────────────────────────┐
│         Pydantic Schema Validation                  │
│  (validate request body, type checking)             │
└─────────────────────────────────────────────────────┘
    │
    ▼ (authentication, authorization)
┌─────────────────────────────────────────────────────┐
│         Business Logic (CRUD Services)              │
│  game_service.py, board_service.py, etc.            │
│  (turn validation, ship placement, attacks)         │
└─────────────────────────────────────────────────────┘
    │
    ▼ (query, insert, update)
┌─────────────────────────────────────────────────────┐
│         SQLAlchemy ORM                              │
│  (maps Python objects to database tables)           │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│         Database (PostgreSQL / SQLite)              │
│  users, games, boards, ships, game_history         │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

**users**
- `user_id` (PK) - Unique identifier
- `username` - Unique, alphanumeric + hyphen/underscore
- `email` - Unique, valid email format
- `password_hash` - bcrypt(cost=12) hashed password
- `created_at` - Account creation timestamp

**games**
- `game_id` (PK) - Unique game identifier
- `player1_id` (FK) - User who created the game
- `player2_id` (FK) - User who joined the game (null until joined)
- `turn` - Current player's ID (1 = player1_id, 2 = player2_id)
- `game_status` - "waiting", "active", or "finished"
- `winner_id` (FK) - User ID of winner (null if not finished)
- `created_at` - Game start time
- `updated_at` - Last action time

**boards**
- `board_id` (PK) - Unique board identifier
- `game_id` (FK) - Which game this board belongs to
- `player_id` (FK) - Which player owns this board
- `board_state` - 10×10 2D array of strings ("O", "S", "H", "M")
- `board_status` - "open" or "locked" (locked = ready to play)
- `created_at` - Board creation time

**ships**
- `ship_id` (PK) - Unique ship identifier
- `board_id` (FK) - Which board this ship is on
- `ship_type` - "carrier", "battleship", "cruiser", "submarine", "destroyer"
- `start_row` - Top or leftmost row (0-9)
- `start_col` - Top or leftmost column (0-9)
- `orientation` - "horizontal" or "vertical"
- `ship_hits` - List of coordinates that have been hit
- `sunk` - Boolean (true if hits >= ship size)
- `created_at` - Placement time

**game_history** (optional, for audit trail)
- `history_id` (PK)
- `game_id` (FK)
- `player_id` (FK)
- `action` - "place_ship", "attack", "surrender"
- `coordinates` - Where the action occurred
- `result` - "hit", "miss", or null
- `timestamp` - When the action happened

---

## Authentication Flow

### JWT (JSON Web Token)

1. **Login Request**
   ```
   POST /auth/login
   username=tom&password=SecurePass123
   ```

2. **Server Response**
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "token_type": "bearer"
   }
   ```

3. **Token Structure (decoded)**
   ```json
   {
     "sub": "tom",           // username
     "user_id": 1,             // user ID
     "exp": 1730765273,        // expiration (30 min from now)
     "iat": 1730761673         // issued at
   }
   ```

4. **Client Storage**
   - JWT stored in `localStorage` (persistent across browser sessions)
   - Included in `Authorization: Bearer <token>` header on all subsequent requests

5. **Server Validation**
   - On every request, decode JWT and verify signature
   - Check expiration time
   - If expired, client must login again
   - If invalid signature, request rejected (401 Unauthorized)

### Rate Limiting

- After **5 failed login attempts**, account is locked for **5 minutes**
- Failed attempt is tracked by username
- Timer resets on successful login or after 5 minutes pass
- Implemented in `auth_service.py` using in-memory counter

---

## Security Design Decisions

### Password Hashing: bcrypt (cost factor 12)

**Bcrypt**
- Slow hashing (cost 12 = 2^12 iterations) = resistant to brute force
- Automatic random salt per password = rainbow tables ineffective
- Industry standard, used by AWS, major web apps

**Example:**
```python
# Same password, different hashes (different salts)
hash1 = bcrypt.hashpw("password123", bcrypt.gensalt(rounds=12))
hash2 = bcrypt.hashpw("password123", bcrypt.gensalt(rounds=12))
# hash1 ≠ hash2, but both verify correctly
```

### CSRF Protection: Double-Submit Cookie

**Advantages**
- No server-side session storage needed (stateless)
- Works with stateless JWT authentication
- Simple and effective for this use case

**How it works:**
1. Client requests CSRF token from `/api/csrf-token`
2. Server sets `anti-csrf-token` cookie and returns token in response
3. On any state-changing request (POST, PUT, DELETE), client includes:
   - `X-CSRF-Token` header with the token value
   - Cookie automatically sent by browser
4. Server verifies cookie value matches header value
5. If no match, request rejected (403 Forbidden)

**Protection:**
- Attacker can trick user into visiting malicious site
- Malicious site can't read the token (same-origin policy)
- Attacker can't forge the header (CORS blocks it)
- Safe!

### Input Validation: Pydantic

All requests validated with Pydantic schemas:
- Type checking (username must be string, coordinates must be list of ints)
- Range validation (coordinates must be 0-9)
- Format validation (email must be valid email format)
- **Invalid requests rejected before reaching business logic**

Example:
```python
class AttackData(BaseModel):
    coordinates: List[int]

    @field_validator('coordinates')
    def validate_coordinates(cls, v):
        if len(v) != 2:
            raise ValueError('Must be [row, col]')
        if not all(0 <= c < 10 for c in v):
            raise ValueError('Out of bounds')
        return v
```

### SQL Injection Prevention: SQLAlchemy ORM

**Never use raw SQL:**
```python
# SQL injection risk
db.execute(f"SELECT * FROM users WHERE user_id = {user_id}")

# SQLAlchemy parameterizes automatically
db.query(User).filter(User.user_id == user_id).first()
```

SQLAlchemy translates to parameterized SQL:
```sql
-- Sent to database as:
SELECT * FROM users WHERE user_id = ?
-- With parameter: [user_id]
```

### Security Headers

Set via `SecurityHeadersMiddleware` in `main.py`:

| Header | Purpose | Value |
|--------|---------|-------|
| `X-Content-Type-Options` | Prevent MIME sniffing | `nosniff` |
| `X-Frame-Options` | Prevent clickjacking | `DENY` |
| `X-XSS-Protection` | XSS protection (legacy) | `1; mode=block` |
| `Strict-Transport-Security` | Force HTTPS | `max-age=31536000` |
| `Content-Security-Policy` | Restrict resource loading | `default-src 'self'...` |
| `Referrer-Policy` | Prevent referrer leakage | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disable risky features | `geolocation=(), microphone=()` |

---

## Game Logic: Key Algorithms

### Ship Placement Validation

When placing a ship, verify:
1. **Bounds** - Ship fits entirely within 10×10 grid
2. **No Overlap** - No existing ship at those coordinates
3. **Correct Size** - Carrier=5, Battleship=4, Cruiser=3, Submarine=3, Destroyer=2
4. **Correct Count** - Only 5 ships per board (one of each type)

```python
def validate_ship_placement(board_id, ship_type, start_row, start_col, orientation):
    # Check bounds
    ship_size = SHIP_SIZES[ship_type]
    if orientation == "horizontal":
        if start_col + ship_size > 10:
            return False
    else:  # vertical
        if start_row + ship_size > 10:
            return False

    # Check overlap with existing ships
    for existing_ship in db.query(Ship).filter(Ship.board_id == board_id):
        if coordinates_overlap(ship, existing_ship):
            return False

    return True
```

### Attack Validation

When attacking, verify:
1. **Game Active** - Game status must be "active"
2. **Your Turn** - Current turn must be your ID
3. **Valid Coordinates** - Must be 0-9 for both row and col
4. **No Double Attack** - Can't attack same cell twice

```python
def attack(game_id, player_id, coordinates):
    game = db.query(Game).filter(Game.game_id == game_id).first()

    # Validate game state
    if game.game_status != "active":
        raise ValidationError("Game not active")

    if game.turn != player_id:
        raise PermissionError("Not your turn")

    # Validate coordinates
    row, col = coordinates
    if not (0 <= row < 10 and 0 <= col < 10):
        raise ValidationError("Out of bounds")

    # Get opponent's board
    opponent_board = db.query(Board).filter(
        Board.game_id == game_id,
        Board.player_id != player_id
    ).first()

    # Check double attack
    if opponent_board.board_state[row][col] in ["H", "M"]:
        raise ValidationError("Already attacked here")

    # Process attack
    result = "H" if opponent_board.board_state[row][col] == "S" else "M"
    opponent_board.board_state[row][col] = result
    db.commit()

    # Check win condition
    if all_opponent_ships_sunk(opponent_board):
        game.game_status = "finished"
        game.winner_id = player_id
    else:
        game.turn = opponent_id  # Switch turns

    db.commit()
```

### Win Condition

A player wins when all opponent ships are sunk:
```python
def all_ships_sunk(board):
    for ship in board.ships:
        hit_count = len(ship.ship_hits)
        ship_size = SHIP_SIZES[ship.ship_type]
        if hit_count < ship_size:
            return False  # This ship still has unhit squares
    return True  # All ships fully hit
```

---

## Frontend: React Component Architecture

### Page Structure

**LandingPage** - Home/splash screen
- Hero section with game description
- "Get Started" button → RegisterPage

**RegisterPage** - Account creation
- Form: username, email, password
- Password strength indicator
- Submit → LoginPage on success

**LoginPage** - Authentication
- Form: username, password
- "Forgot Password?" link (future)
- Submit → UserProfile on success
- Stores JWT in localStorage

**UserProfile** - User dashboard
- Display username, email, stats
- "Create Game" button → CreateGamePage
- "Browse Games" button → BrowseGamesPage
- "Logout" button

**CreateGamePage** - New game form
- Auto-filled with current user as Player 1
- Submit → BrowseGamesPage (shows the new game)

**BrowseGamesPage** - Game browser
- List of waiting games (not yet started)
- "Join Game" button for each
- "Call Bot" button (or bot option on creation)
- Filters: waiting/active/finished

**GamePage** - Active game board
- Two boards (yours and opponent's)
- Ship placement phase (before game starts)
- Combat phase (after both locked boards)
- Attack history log
- "Surrender" button
- Real-time turn indicator

**ImpressumPage** - Legal/impressum

### Component Hierarchy

```
App (routing, auth context)
├─ LandingPage
├─ RegisterPage
├─ LoginPage
├─ UserProfile
├─ CreateGamePage
├─ BrowseGamesPage
├─ GamePage
│  ├─ Board (10x10 grid)
│  │  └─ Cell (individual square, clickable)
│  ├─ GameOverPopup (win/loss modal)
│  ├─ ConfirmModal (surrender confirmation)
│  └─ AttackLog (history sidebar)
└─ Navbar (persistent)
   └─ ThemeToggle (light/dark mode)
```

### State Management

- **Global Auth State** - Stored in Context API
  - `currentUser` - Logged-in user info
  - `token` - JWT stored in localStorage
- **Game State** - Fetched from API on each action
  - No client-side game state (server is source of truth)
  - Prevents cheating (can't modify game state in browser)

---

## Performance Considerations

### Database Queries

- **N+1 Prevention** - Use SQLAlchemy relationships to load related objects
- **Pagination** - All list endpoints support `skip` and `limit`
- **Indexing** - Primary keys and foreign keys auto-indexed
- **Connection Pooling** - SQLAlchemy manages connection pool

### API Response Times

- **Authentication** - O(1) JWT decode
- **Game Creation** - O(1) insert
- **Attack** - O(1) board cell update
- **List Games** - O(N) where N = limit (paginated)

### Frontend Optimization

- **Code Splitting** - Lazy load pages with React Router
- **Caching** - Static assets cached via HTTP headers
- **Minification** - Production build minifies JS/CSS
- **Image Optimization** - Use WebP with fallbacks (future)

---

## Deployment Architecture

### Local Development

```
http://localhost:3000 (React dev server) → http://localhost:8000 (FastAPI dev server)
```

### Production (Render)

```
Frontend (React build)
├─ Static files served by Render
└─ API calls to FastAPI backend

Backend (FastAPI)
├─ Environment variables from .env
├─ PostgreSQL database
└─ Auto-scaling on traffic spikes
```

---

## Future Architectural Improvements

1. **WebSocket for Real-Time Updates** - Replace polling with server-sent events
2. **Redis for Session Caching** - Improve login rate limiting
3. **Message Queue (Celery)** - Async tasks (email notifications, bot AI)
4. **Microservices** - Separate bot service, analytics service
5. **GraphQL API** - Alternative to REST for flexible queries
6. **Testing** - Increase coverage with integration and E2E tests

---
