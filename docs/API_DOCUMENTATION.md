# API Reference

Complete API documentation for the BattleShip backend. This guide is written for developers and contributors getting familiar with the codebase.

**Base URL:** `http://localhost:8000` (development)

**Live Docs:** `http://localhost:8000/docs` (Swagger UI - auto-generated)

---

## Technical Architecture Overview

### How the API Works

BattleShip is a **turn-based multiplayer game** where two players compete to sink each other's fleet of ships. The API is built with **FastAPI** (Python framework) and uses a **REST architecture** for all endpoints.

**Key Concepts:**

1. **Authentication** - Players authenticate once with username/password, receive a JWT token, and include it in all requests
2. **Games** - A game object represents one match between two players (player1 and player2)
3. **Boards** - Each player has a 10x10 board. One player owns their ships, opponent sees only hits/misses
4. **Ships** - Five ship types (carrier, battleship, cruiser, submarine, destroyer) are placed on a board before game starts
5. **Turns** - Once ships are placed, players alternate attacking enemy coordinates
6. **Turn-based Validation** - Server enforces that only the current player can attack; prevents cheating

### Request/Response Flow

```
Client Request → FastAPI Router → Pydantic Validation → Business Logic Service → Database → Response
```

1. **Router** (`app/api/routes/`) - Handles HTTP verbs, authentication, basic validation
2. **Service Layer** (`app/crud/`) - Contains game logic, authorization, business rules
3. **Database** - SQLAlchemy ORM models persist data (users, games, boards, ships)
4. **Response** - Always JSON, follows consistent schema

### Authentication & Security

- **JWT (HS256)** - Stateless tokens signed with SECRET_KEY
- **Token Expiry** - 30 minutes by default (re-login to get new token)
- **Authorization** - Server checks that you own the resource before allowing modifications
- **Turn Validation** - Server enforces turn order (player1 moves, then player2, etc.)
- **Rate Limiting** - 5 failed logins = 5 minute account lockout

### Board State Encoding

When you fetch a board, the `board_state` is a 10x10 2D array of **strings** with values:

- `"O"` = Empty water (no ship, no attack)
- `"S"` = Your ship placed here (only visible on your own board)
- `"H"` = Hit (ship was hit, visible to both players)
- `"M"` = Missed attack (you attacked empty water, visible to both players)

When viewing **opponent's board**, ships are hidden:
- Their ships (value `"S"`) are replaced with `"O"` (appears empty)
- Hits (`"H"`) and misses (`"M"`) are still visible
- You only see `"H"`, `"M"`, or `"O"` on opponent's board

---

## Authentication

The BattleShip API uses **JWT (JSON Web Tokens)** for stateless authentication. After login, include the token in all requests.

**How it works:**
1. Call `POST /login` with username and password
2. Receive `access_token` (valid 30 minutes)
3. Include `Authorization: Bearer <token>` in all subsequent requests
4. If token expires, login again

**Keep tokens secure** - Do not commit them to git, store in client-side code, or share publicly.

**All requests must use HTTPS in production** - HTTP will be rejected.

**Authenticated Request Example:**
```bash
curl http://localhost:8000/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImV4cCI6MTczMDc2NTI3M30.2q..."
```

---

## Users

### Register a New Account

Create a new player account. Username and email must be unique.

**Endpoint:** `POST /users/`

**Authentication:** Not required

**Description:**
New players call this endpoint to create an account. Passwords are hashed with bcrypt (cost 12) before storage. No plaintext passwords are ever stored in the database.

**Request Body:**
```json
{
  "username": "myusername",
  "email": "myname@example.com",
  "password": "Password123!"
}
```

**Username Requirements:**
- 3-50 characters
- Alphanumeric + hyphen (-) and underscore (_) only
- Must be unique (checked against database)

**Email Requirements:**
- Valid email format
- Must be unique (checked against database)

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 digit (0-9)
- At least 1 special character
- Example: `Password123!`, `MyGame2025!`

**Example Request:**
```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "mirko",
    "email": "myemail@example.com",
    "password": "RandomPass123!"
  }'
```

**Response (201 Created):**
```json
{
  "user_id": 1,
  "username": "mirko",
  "email": "myemail@example.com"
}
```

**Error Responses:**

409 Conflict - Username or email already registered:
```json
{
  "detail": "Username or email already registered"
}
```

400 Bad Request - Password doesn't meet requirements:
```json
{
  "detail": [
    {
      "loc": ["body", "password"],
      "msg": "Password must contain uppercase letter",
      "type": "value_error"
    }
  ]
}
```

---

### Login

Authenticate with username and password to receive a JWT token.

**Endpoint:** `POST /login`

**Authentication:** Not required

**Description:**
Players call this endpoint to receive a JWT access token. The token must be included in all subsequent requests. Tokens expire after 30 minutes.

After 5 failed login attempts, the account is locked for 5 minutes (rate limiting).

**Request Body:**
Form-encoded (not JSON):
```
username=alice&password=SecurePass123
```

**Example Request:**
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=alice&password=SecurePass123"
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImV4cCI6MTczMDc2NTI3M30.2q...",
  "token_type": "bearer"
}
```

**Error Responses:**

401 Unauthorized - Wrong username/password:
```json
{
  "detail": "Incorrect username or password"
}
```

429 Too Many Requests - Account locked after 5 failed attempts:
```json
{
  "detail": "Account temporarily locked. Try again in 5 minutes."
}
```

---

### Get Current User Profile

Retrieve your own user profile and authentication details.

**Endpoint:** `GET /users/me`

**Authentication:** Required ✅

**Description:**
Call this endpoint to get information about the authenticated user. Useful for verifying login or displaying profile information.

**Example Request:**
```bash
curl http://localhost:8000/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "user_id": 1,
  "username": "alice",
  "email": "alice@example.com"
}
```

**Error Responses:**

401 Unauthorized - Invalid or expired token:
```json
{
  "detail": "Invalid authentication token"
}
```

---

### Get User by ID

Retrieve public information about any user by ID.

**Endpoint:** `GET /users/{user_id}`

**Authentication:** Not required

**Description:**
Retrieve public user information. Does not require authentication. This endpoint is useful for displaying player profiles or leaderboards.

**Path Parameters:**
- `user_id` (integer, required) - The user ID to retrieve

**Example Request:**
```bash
curl http://localhost:8000/users/1
```

**Response (200 OK):**
```json
{
  "user_id": 1,
  "username": "alice",
  "email": "alice@example.com"
}
```

**Error Responses:**

404 Not Found - User doesn't exist:
```json
{
  "detail": "User not found"
}
```

---

### List All Users

Get a paginated list of all registered users.

**Endpoint:** `GET /users/`

**Authentication:** Not required

**Description:**
Retrieve a paginated list of users. Useful for player directories or leaderboards. Results are not sorted by any particular order.

**Query Parameters:**
- `skip` (integer, optional) - Number of users to skip. Default: 0. Max: 10000
- `limit` (integer, optional) - Number of users to return. Default: 100. Max: 100

**Example Request:**
```bash
# Get first 10 users
curl "http://localhost:8000/users/?skip=0&limit=10"

# Get next 10 users
curl "http://localhost:8000/users/?skip=10&limit=10"
```

**Response (200 OK):**
```json
[
  {
    "user_id": 1,
    "username": "alice",
    "email": "alice@example.com"
  },
  {
    "user_id": 2,
    "username": "bob",
    "email": "bob@example.com"
  }
]
```

---

## Games

### Create a New Game

Start a new game as player 1.

**Endpoint:** `POST /games/`

**Authentication:** Required ✅

**Description:**
Creates a new game instance with you as player 1. The game starts in "waiting" status, waiting for player 2 to join. Both players must place their ships before the game can start.

**Query Parameters:**
- `player1_id` (integer, required) - Your user ID. Must match the authenticated user.

**Example Request:**
```bash
curl -X POST "http://localhost:8000/games/?player1_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (201 Created):**
```json
{
  "game_id": 1,
  "player1_id": 1,
  "player2_id": null,
  "turn": null,
  "game_status": "waiting",
  "winner_id": null,
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Error Responses:**

403 Forbidden - Attempting to create game for another user:
```json
{
  "detail": "You can only create games for yourself"
}
```

401 Unauthorized - Not authenticated:
```json
{
  "detail": "Invalid authentication token"
}
```

---

### Join an Existing Game

Join a game as player 2.

**Endpoint:** `PUT /games/{game_id}/join`

**Authentication:** Required ✅

**Description:**
Join an existing game as player 2. The game must be in "waiting" status. Once both players have joined, boards are created for both players. Then both players must place their ships before the game can start.

**Path Parameters:**
- `game_id` (integer, required) - The game ID to join

**Query Parameters:**
- `player2_id` (integer, required) - Your user ID. Must match the authenticated user.

**Example Request:**
```bash
curl -X PUT "http://localhost:8000/games/1/join?player2_id=2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "game_id": 1,
  "player1_id": 1,
  "player2_id": 2,
  "turn": null,
  "game_status": "waiting",
  "winner_id": null,
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Error Responses:**

404 Not Found - Game doesn't exist:
```json
{
  "detail": "Game not found"
}
```

403 Forbidden - Attempting to join as another user:
```json
{
  "detail": "You can only join games as yourself"
}
```

---

### Start a Game

Begin the game (both players must have placed ships first).

**Endpoint:** `PUT /games/{game_id}/start`

**Authentication:** Required ✅

**Description:**
Transitions the game from "waiting" to "active" status. Both players must have placed all their ships on their boards before this endpoint will succeed. The turn is set to player1 (first player can attack).

**Path Parameters:**
- `game_id` (integer, required) - The game ID to start

**Example Request:**
```bash
curl -X PUT "http://localhost:8000/games/1/start" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "game_id": 1,
  "player1_id": 1,
  "player2_id": 2,
  "turn": 1,
  "game_status": "active",
  "winner_id": null,
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Error Responses:**

400 Bad Request - Both players haven't placed ships:
```json
{
  "detail": "Game cannot be started"
}
```

---

### Get Game Details

Retrieve the current state of a game.

**Endpoint:** `GET /games/{game_id}`

**Authentication:** Required ✅

**Description:**
Fetch the current game state, including turn information, game status, and winner (if game is finished). This endpoint is used frequently during gameplay to check whose turn it is and if the game is still active.

**Path Parameters:**
- `game_id` (integer, required) - The game ID to retrieve

**Example Request:**
```bash
curl "http://localhost:8000/games/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "game_id": 1,
  "player1_id": 1,
  "player2_id": 2,
  "turn": 1,
  "game_status": "active",
  "winner_id": null,
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Game Status Values:**
- `"waiting"` - Game created, waiting for player 2 to join
- `"active"` - Both players joined and placed ships, game is in progress
- `"finished"` - One player has sunk all opponent ships (or surrendered)

**Error Responses:**

404 Not Found - Game doesn't exist:
```json
{
  "detail": "Game not found"
}
```

---

### List All Games

Get a paginated list of all games.

**Endpoint:** `GET /games`

**Authentication:** Required ✅

**Description:**
Retrieve all games (both waiting and active). Useful for displaying available games to join or a game history. Results are paginated.

**Query Parameters:**
- `skip` (integer, optional) - Number of games to skip. Default: 0
- `limit` (integer, optional) - Number of games to return. Default: 100

**Example Request:**
```bash
# Get first 10 games
curl "http://localhost:8000/games?skip=0&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get next 10 games
curl "http://localhost:8000/games?skip=10&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
[
  {
    "game_id": 1,
    "player1_id": 1,
    "player2_id": 2,
    "turn": 1,
    "game_status": "active",
    "winner_id": null,
    "created_at": "2025-11-21T10:30:00Z"
  },
  {
    "game_id": 2,
    "player1_id": 3,
    "player2_id": null,
    "turn": null,
    "game_status": "waiting",
    "winner_id": null,
    "created_at": "2025-11-21T10:35:00Z"
  }
]
```

---

### Attack Opponent

Submit an attack on the opponent's board.

**Endpoint:** `POST /games/{game_id}/attack`

**Authentication:** Required ✅

**Description:**
Attack a specific coordinate on the opponent's board. Only the player whose turn it is can attack. After a successful attack, the turn switches to the other player. If you sink all opponent ships, you win immediately.

The server validates that:
1. The game is active
2. It's your turn (not opponent's turn)
3. Coordinates are valid (0-9 for both row and column)
4. You haven't already attacked this coordinate

**Path Parameters:**
- `game_id` (integer, required) - The game ID

**Query Parameters:**
- `player_id` (integer, required) - Your user ID. Must match the authenticated user.

**Request Body:**
```json
{
  "coordinates": [3, 5]
}
```

**Coordinate System:**
- 10x10 grid (0-indexed)
- Format: `[row, column]`
- Valid range: `[0, 0]` to `[9, 9]`
- Example: `[3, 5]` = row 3, column 5

**Example Request:**
```bash
curl -X POST "http://localhost:8000/games/1/attack?player_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"coordinates": [3, 5]}'
```

**Response (200 OK):**
```json
{
  "game_id": 1,
  "player1_id": 1,
  "player2_id": 2,
  "turn": 2,
  "game_status": "active",
  "winner_id": null,
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Error Responses:**

400 Bad Request - Invalid coordinates:
```json
{
  "detail": "Invalid coordinate format or out of bounds"
}
```

403 Forbidden - Not your turn:
```json
{
  "detail": "It is not your turn"
}
```

403 Forbidden - Can't attack as different user:
```json
{
  "detail": "You can only attack as yourself"
}
```

---

### Surrender Game

Give up and concede the game (opponent wins immediately).

**Endpoint:** `POST /games/{game_id}/surrender`

**Authentication:** Required ✅

**Description:**
Immediately end the game with you as the loser. The opponent is set as the winner. Useful if a player wants to quit early.

**Path Parameters:**
- `game_id` (integer, required) - The game ID

**Query Parameters:**
- `player_id` (integer, required) - Your user ID. Must match the authenticated user.

**Example Request:**
```bash
curl -X POST "http://localhost:8000/games/1/surrender?player_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "game_id": 1,
  "player1_id": 1,
  "player2_id": 2,
  "turn": 2,
  "game_status": "finished",
  "winner_id": 2,
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Error Responses:**

403 Forbidden - Can't surrender as different user:
```json
{
  "detail": "You can only surrender as yourself"
}
```

---

## Boards

### Create a Board

Create a new game board for a player. Called automatically when both players join a game.

**Endpoint:** `POST /boards/`

**Authentication:** Not required (typically called by backend)

**Description:**
Creates a 10x10 board for a player in a game. Initially all cells are empty (value 0). This endpoint is usually called automatically by the backend when a game is joined, but can be called manually if needed.

**Request Body:**
```json
{
  "game_id": 1,
  "player_id": 1
}
```

**Example Request:**
```bash
curl -X POST http://localhost:8000/boards/ \
  -H "Content-Type: application/json" \
  -d '{
    "game_id": 1,
    "player_id": 1
  }'
```

**Response (201 Created):**
```json
{
  "board_id": 1,
  "game_id": 1,
  "player_id": 1,
  "board_state": [
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"]
  ],
  "board_status": "open",
  "created_at": "2025-11-21T10:30:00Z"
}
```

---

### Get Board

Retrieve a board's current state. The response is filtered based on whose perspective you're viewing.

**Endpoint:** `GET /boards/{board_id}`

**Authentication:** Required ✅

**Description:**
Fetches the board state. The server automatically filters what you see:
- **Your own board:** Shows all ships and attacks
- **Opponent's board:** Shows only hits and misses (ships are hidden)

This prevents cheating by hiding opponent ship locations until they're discovered.

**Path Parameters:**
- `board_id` (integer, required) - The board ID to retrieve

**Example Request:**
```bash
curl http://localhost:8000/boards/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
If you're viewing your own board:
```json
{
  "board_id": 1,
  "game_id": 1,
  "player_id": 1,
  "board_state": [
    ["S", "S", "S", "S", "S", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["S", "O", "O", "O", "O", "S", "S", "S", "O", "O"],
    ["S", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["S", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["S", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"]
  ],
  "board_status": "locked",
  "created_at": "2025-11-21T10:30:00Z"
}
```

If you're viewing opponent's board:
```json
{
  "board_id": 2,
  "game_id": 1,
  "player_id": 2,
  "board_state": [
    ["H", "H", "H", "M", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "M", "O", "O", "O", "H", "M", "H", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"]
  ],
  "board_status": "locked",
  "created_at": "2025-11-21T10:35:00Z"
}
```

**Board State Encoding:**
- `"O"` = Empty water (no ship, no attack)
- `"S"` = Ship placed (only visible on your own board; hidden as `"O"` on opponent's board)
- `"H"` = Hit (ship was hit, visible to both players)
- `"M"` = Missed attack (visible to both players)

**Error Responses:**

404 Not Found - Board doesn't exist:
```json
{
  "detail": "Board not found"
}
```

---

### Update Board

Update the board state (used when ships are placed or attacks modify the board).

**Endpoint:** `PUT /boards/{board_id}`

**Authentication:** Required ✅

**Description:**
Update a board's state. This endpoint is called when ships are placed or when attacks hit/miss. The new board_state must be a valid 10x10 2D array.

**Path Parameters:**
- `board_id` (integer, required) - The board ID to update

**Request Body:**
```json
{
  "board_state": [
    ["S", "S", "S", "S", "S", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["S", "O", "O", "O", "O", "S", "S", "S", "O", "O"],
    ["S", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["S", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["S", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"]
  ]
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:8000/boards/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "board_state": [["S", "S", "S", "S", "S", "O", ...], ...]
  }'
```

**Response (200 OK):**
```json
{
  "board_id": 1,
  "game_id": 1,
  "player_id": 1,
  "board_state": [
    ["S", "S", "S", "S", "S", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["S", "O", "O", "O", "O", "S", "S", "S", "O", "O"],
    ["S", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["S", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["S", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"],
    ["O", "O", "O", "O", "O", "O", "O", "O", "O", "O"]
  ],
  "board_status": "locked",
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Error Responses:**

400 Bad Request - Invalid board state:
```json
{
  "detail": "Board state must be a 10x10 grid"
}
```

403 Forbidden - Not your board:
```json
{
  "detail": "You can only update your own board"
}
```

---

## Ships

### Place a Ship

Place a ship on your board before the game starts.

**Endpoint:** `POST /ships/`

**Authentication:** Required ✅

**Description:**
Place a ship on your board. All ships must be placed before the game can start. Ships must:
- Not overlap with existing ships
- Fit entirely within the 10x10 grid
- Use valid ship type and orientation

The placement is validated on the server to prevent cheating.

**Request Body:**
```json
{
  "board_id": 1,
  "ship_type": "carrier",
  "start_row": 0,
  "start_col": 0,
  "orientation": "horizontal"
}
```

**Ship Types and Sizes:**
| Type | Size | Count |
|------|------|-------|
| `carrier` | 5 squares | 1 |
| `battleship` | 4 squares | 1 |
| `cruiser` | 3 squares | 1 |
| `submarine` | 3 squares | 1 |
| `destroyer` | 2 squares | 1 |

**Orientation:**
- `"horizontal"` - Ship extends to the right
- `"vertical"` - Ship extends downward

**Coordinates:**
- `start_row` (0-9) - Top or leftmost row of the ship
- `start_col` (0-9) - Top or leftmost column of the ship

**Example Request:**
```bash
# Place a 5-square carrier horizontally starting at (0,0)
curl -X POST http://localhost:8000/ships/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": 1,
    "ship_type": "carrier",
    "start_row": 0,
    "start_col": 0,
    "orientation": "horizontal"
  }'
```

**Response (201 Created):**
```json
{
  "ship_id": 1,
  "board_id": 1,
  "ship_type": "carrier",
  "start_row": 0,
  "start_col": 0,
  "orientation": "horizontal",
  "hits": 0,
  "sunk": false,
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Error Responses:**

403 Forbidden - Not your board:
```json
{
  "detail": "You can only place ships on your own board"
}
```

400 Bad Request - Invalid placement (overlap, out of bounds, etc.):
```json
{
  "detail": "Invalid ship placement"
}
```

400 Bad Request - Invalid ship type:
```json
{
  "detail": "Invalid ship type. Must be one of: carrier, battleship, cruiser, submarine, destroyer"
}
```

---

### Get Ships on Board

List all ships placed on a board.

**Endpoint:** `GET /ships/{board_id}`

**Authentication:** Required ✅

**Description:**
Retrieve all ships on a specific board. Shows the ship type, location, hits, and whether each ship is sunk. Useful for validating that all ships are placed before starting the game.

**Path Parameters:**
- `board_id` (integer, required) - The board ID to retrieve ships for

**Example Request:**
```bash
curl "http://localhost:8000/ships/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
[
  {
    "ship_id": 1,
    "board_id": 1,
    "ship_type": "carrier",
    "start_row": 0,
    "start_col": 0,
    "orientation": "horizontal",
    "hits": 2,
    "sunk": false,
    "created_at": "2025-11-21T10:30:00Z"
  },
  {
    "ship_id": 2,
    "board_id": 1,
    "ship_type": "destroyer",
    "start_row": 3,
    "start_col": 2,
    "orientation": "vertical",
    "hits": 0,
    "sunk": false,
    "created_at": "2025-11-21T10:31:00Z"
  },
  {
    "ship_id": 3,
    "board_id": 1,
    "ship_type": "submarine",
    "start_row": 6,
    "start_col": 5,
    "orientation": "horizontal",
    "hits": 3,
    "sunk": true,
    "created_at": "2025-11-21T10:32:00Z"
  }
]
```

**Fields Explained:**
- `hits` - Number of times this ship has been hit
- `sunk` - True if hits >= ship size (e.g., carrier sunk after 5 hits)

**Error Responses:**

404 Not Found - Board doesn't exist:
```json
{
  "detail": "Board not found"
}
```

403 Forbidden - Not your board:
```json
{
  "detail": "You can only view ships on your own board"
}
```

---

## Bot

### Call Bot to Join Game

Invite an AI bot to join your game as player 2.

**Endpoint:** `POST /bot/{game_id}/call-bot`

**Authentication:** Required ✅

**Description:**
Call an AI bot to join an existing game as player 2. The bot will automatically place ships and take turns attacking your board. Useful for playing against the computer when no human opponent is available.

The bot must join a game that is currently waiting for player 2. Once the bot joins, both players' boards are created and the bot will automatically place its ships.

**Path Parameters:**
- `game_id` (integer, required) - The game ID to join

**Example Request:**
```bash
curl -X POST "http://localhost:8000/bot/1/call-bot" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (201 Created):**
```json
{
  "game_id": 1,
  "player1_id": 1,
  "player2_id": 100,
  "turn": null,
  "game_status": "waiting",
  "winner_id": null,
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Error Responses:**

403 Forbidden - Not your game:
```json
{
  "detail": "You can only call the bot for games you own"
}
```

400 Bad Request - Game not waiting for player 2:
```json
{
  "detail": "Game is not waiting for a second player"
}
```

404 Not Found - Game doesn't exist:
```json
{
  "detail": "Game not found"
}
```

---

### Trigger Bot Attack

Trigger the bot's turn to attack your board.

**Endpoint:** `POST /bot/{game_id}/bot-attack`

**Authentication:** Required ✅

**Description:**
Force the bot to take its turn and attack one of your board coordinates. Call this endpoint after you attack to let the bot respond. The bot will choose a coordinate to attack using its strategy algorithm.

This endpoint validates that it's actually the bot's turn before performing the attack.

**Path Parameters:**
- `game_id` (integer, required) - The game ID where bot should attack

**Example Request:**
```bash
curl -X POST "http://localhost:8000/bot/1/bot-attack" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "game_id": 1,
  "player1_id": 1,
  "player2_id": 100,
  "turn": 1,
  "game_status": "active",
  "winner_id": null,
  "created_at": "2025-11-21T10:30:00Z"
}
```

**Error Responses:**

403 Forbidden - Not bot's turn:
```json
{
  "detail": "It is not the bot's turn"
}
```

400 Bad Request - Game not active:
```json
{
  "detail": "Game is not active"
}
```

404 Not Found - Game doesn't exist:
```json
{
  "detail": "Game not found"
}
```

---

## CSRF Protection

### Get CSRF Token

Initialize CSRF token for form submissions.

**Endpoint:** `GET /api/csrf-token`

**Authentication:** Not required

**Description:**
Initialize a CSRF token by calling this endpoint. The server responds with a message and automatically sets an `anti-csrf-token` cookie in your response headers. Include this token in all state-changing requests (POST, PUT, DELETE) in the `X-CSRF-Token` header.

This protects against Cross-Site Request Forgery attacks by validating that requests come from your application, not from malicious third-party sites.

**Example Request:**
```bash
# Call once at page load or app startup
curl -X GET http://localhost:8000/api/csrf-token \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "message": "CSRF token initialized"
}
```

The response also includes a `Set-Cookie` header:
```
Set-Cookie: anti-csrf-token=abc123xyz...; Path=/; HttpOnly; Secure; SameSite=Strict
```

**Using the Token:**
In your next state-changing requests (POST, PUT, DELETE), include the token:
```bash
curl -X POST http://localhost:8000/games/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: abc123xyz..." \
  -d '{...}'
```

**Error Responses:**

This endpoint always succeeds (200 OK). If CSRF validation fails on a later request, you'll see:

403 Forbidden - Missing or invalid CSRF token:
```json
{
  "detail": "CSRF token validation failed"
}
```

---

## Error Handling

### HTTP Status Codes

The BattleShip API uses standard HTTP status codes to indicate success or failure.

| Code | Meaning | Example |
|------|---------|---------|
| **200** | OK | Request succeeded, data returned |
| **201** | Created | Resource created successfully (POST requests) |
| **400** | Bad Request | Request invalid (invalid parameters, validation errors) |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | Not authorized (e.g., not your turn, not your board) |
| **404** | Not Found | Resource doesn't exist (user, game, board, etc.) |
| **409** | Conflict | Resource already exists (username taken, email registered) |
| **429** | Too Many Requests | Rate limit exceeded (login lockout) |
| **500** | Server Error | Unexpected server error (rare) |

### Error Response Format

All errors return JSON with a human-readable `detail` field:

**Simple Error:**
```json
{
  "detail": "Game not found"
}
```

**Validation Error (from Pydantic):**
```json
{
  "detail": [
    {
      "loc": ["body", "password"],
      "msg": "Password must contain uppercase letter",
      "type": "value_error"
    }
  ]
}
```

### Common Errors and Solutions

**401 Unauthorized - "Invalid authentication token"**
- Token is missing or expired
- Solution: Login again with `POST /login` to get a fresh token

**403 Forbidden - "It is not your turn"**
- You tried to attack but it's opponent's turn
- Solution: Wait for opponent to attack, then check game state with `GET /games/{game_id}`

**404 Not Found - "Game not found"**
- Game ID doesn't exist
- Solution: Check game ID is correct, list games with `GET /games`

**409 Conflict - "Username or email already registered"**
- Account with that username or email exists
- Solution: Try different username/email or login with existing account

---

## Complete Workflows

Here are step-by-step examples of common workflows for new developers.

### Workflow 1: Register, Login, View Profile

**Step 1: Register a new account**
```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "SecurePass123"
  }'

# Response:
# {
#   "user_id": 1,
#   "username": "alice",
#   "email": "alice@example.com"
# }
```

**Step 2: Login to get token**
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=alice&password=SecurePass123"

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "bearer"
# }

# Save this token for next requests!
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Step 3: View your profile**
```bash
curl http://localhost:8000/users/me \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "user_id": 1,
#   "username": "alice",
#   "email": "alice@example.com"
# }
```

### Workflow 2: Create Game, Join, Place Ships, Start

**Step 1: Player 1 creates game**
```bash
curl -X POST "http://localhost:8000/games/?player1_id=1" \
  -H "Authorization: Bearer $TOKEN_PLAYER1"

# Response:
# {
#   "game_id": 1,
#   "player1_id": 1,
#   "player2_id": null,
#   "turn": null,
#   "game_status": "waiting",
#   ...
# }
```

**Step 2: Player 2 joins game**
```bash
curl -X PUT "http://localhost:8000/games/1/join?player2_id=2" \
  -H "Authorization: Bearer $TOKEN_PLAYER2"

# Response shows both players are in game
# game_status is still "waiting" - both must place ships
```

**Step 3: Player 1 places ships (on their board)**
```bash
# Get board_id first - it's created when player 2 joins
# Query: GET /boards/?game_id=1 to find board_id

# Place carrier ship
curl -X POST http://localhost:8000/ships/ \
  -H "Authorization: Bearer $TOKEN_PLAYER1" \
  -H "Content-Type: application/json" \
  -d '{
    "board_id": 1,
    "ship_type": "carrier",
    "start_row": 0,
    "start_col": 0,
    "orientation": "horizontal"
  }'

# Repeat for other 4 ships: battleship, cruiser, submarine, destroyer
# Total: 5 ships required
```

**Step 4: Player 2 places ships (on their board)**
```bash
# Same as player 1, but with board_id = 2 (their board)

# Place all 5 ships on board_id: 2
```

**Step 5: Player 1 starts the game**
```bash
curl -X PUT http://localhost:8000/games/1/start \
  -H "Authorization: Bearer $TOKEN_PLAYER1"

# Response:
# {
#   "game_id": 1,
#   "player1_id": 1,
#   "player2_id": 2,
#   "turn": 1,
#   "game_status": "active",  # Now game is live!
#   ...
# }
```

### Workflow 3: Take Turns Attacking

**Step 1: Player 1 attacks**
```bash
curl -X POST "http://localhost:8000/games/1/attack?player_id=1" \
  -H "Authorization: Bearer $TOKEN_PLAYER1" \
  -H "Content-Type: application/json" \
  -d '{"coordinates": [3, 5]}'

# Response:
# {
#   "game_id": 1,
#   ...
#   "turn": 2,  # Now it's player 2's turn!
#   ...
# }
```

**Step 2: Check game state**
```bash
curl "http://localhost:8000/games/1" \
  -H "Authorization: Bearer $TOKEN_PLAYER1"

# Response shows turn: 2 (player 2 must attack now)
```

**Step 3: Player 2 attacks**
```bash
curl -X POST "http://localhost:8000/games/1/attack?player_id=2" \
  -H "Authorization: Bearer $TOKEN_PLAYER2" \
  -H "Content-Type: application/json" \
  -d '{"coordinates": [0, 0]}'

# Response:
# {
#   "game_id": 1,
#   ...
#   "turn": 1,  # Back to player 1
#   ...
# }
```

**Step 4: Continue until someone wins**
- Each player takes turns attacking
- Server tracks hits/misses on both boards
- When all ships of one player are sunk, game ends with winner_id set
- Or a player can surrender with `POST /games/{game_id}/surrender`

### Workflow 4: View Boards

**Player 1 views their own board (with ships visible)**
```bash
curl "http://localhost:8000/boards/1" \
  -H "Authorization: Bearer $TOKEN_PLAYER1"

# Response: board_state shows ships (value: 1) where they placed them
```

**Player 1 views opponent's board (ships hidden)**
```bash
curl "http://localhost:8000/boards/2" \
  -H "Authorization: Bearer $TOKEN_PLAYER1"

# Response: board_state only shows hits (2) and misses (3)
# Ships (value: 1) are hidden until hit
```

**Get all ships on a board**
```bash
curl "http://localhost:8000/ships/1" \
  -H "Authorization: Bearer $TOKEN_PLAYER1"

# Response: List of all ships with their locations and hit counts
```

---

## Development Notes for Contributors

### Adding a New Endpoint

If you need to add a new endpoint:

1. **Define the route** in `Ship/app/api/routes/your_route.py`
2. **Add a service method** in `Ship/app/crud/your_service.py` with the business logic
3. **Define schemas** in `Ship/app/schemas/your_schema.py` for request/response validation
4. **Test it** with `pytest tests/test_your_endpoint.py`
5. **Update this documentation** with examples and error cases

### Authentication Errors to Handle

When building features, always check:
```python
# Verify user is authenticated
if not current_user:
    raise HTTPException(status_code=401, detail="Invalid authentication token")

# Verify user owns the resource
if current_user.user_id != player_id:
    raise HTTPException(status_code=403, detail="You can only... as yourself")
```

### Database Queries

Use SQLAlchemy ORM, never raw SQL:
```python
# secure
game = db.query(Game).filter(Game.game_id == game_id).first()

#  SQL injection risk
game = db.execute(f"SELECT * FROM games WHERE game_id = {game_id}")
```

### Logging

All critical actions are logged via `AuditLogger`:
```python
from app.utils.audit_logger import AuditLogger

AuditLogger.log_game_action(
    user_id=user.user_id,
    game_id=game.game_id,
    action="attack",
    details={"coordinates": [3, 5]}
)
```

---
