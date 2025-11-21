# BattleShip - 1v1 Multiplayer Strategy Game

A production-ready, real-time multiplayer Battleship game built with **FastAPI** (Python) backend and **React** frontend.


## Overview

Battleship is classic turn-based naval combat board game where two player compete to sink each others ships.

## Documentation

This project includes comprehensive documentation.

| Document | Content |
|----------|-----|---------|
| [README.md](./README.md) |  Project overview & quick start (this file) |
| [SECURITY_BRIEF.md](./SECURITY_BRIEF.md) | Threat model, controls, architecture decisions, implemented security measurements  |
| [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) | Endpoint reference, request/response schemas |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute, code standards |
| [WRITING_PROCESS.md](./WRITING_PROCESS.md) | Documentation planning & execution |
| [Diagram](./diagrams) | Visual game/logic explanation |

**API docs (interactive):** `http://localhost:8000/docs` (Swagger UI, auto-generated from FastAPI)

---

## Quick Start

### Perequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 13+

### Backend Setup
```bash
# backend directory
cd /Ship

# create virtual enviroment
python -m venv venv
# activate the enviroment
source venv/Scripts/activate #windows

# install dependencies
pip install -r requirements.txt

# copy the example .env and set up
cp .env.example .env

# start backend service
uvicorn app.main:app --reload # => available at http://localhost:8000
```

### Frontend Setup
```bash
# frontend directory
cd /my-react-app
# install
npm install
# start the frontend service
npm start # => available at http://localhost:3000
```

### for future service starts you can use start script. Command ```./start.sh ```

### First Game - Guide
1. Navigate to /register and fill in the form to register an account.
2. On success -> you will be redirected to /login
3. Login using Username + Password
4. On success -> you will be redirected to your profile page.
5. Head to /create-game and create your first game.
6. You can wait for another player to join your game, or call the Bot (automated player)
7. Game started -> planing phase -> Place your ships. Select which ship to place from the "Available Ships". Ships can be played either horizontal or vertical, use the bottons under "Placement direction". Once you decided where to place a ship, use the button "Place Ship" below the board.
8. After all 5 ships are placed, use the "Lock Board" button to declare you are ready.
9. Both players locked their board -> Playing phase begins
10. Attack a cell on the opponents board. (click on it)
11. After your attack the cell will update: yellow = miss, red = hit.
12. You can see the turn history on the attack log on the left.
13. Opponent attacks your board -> then its your turn again.
14. First player to find all opponent ships wins.
15. Pop-up declaring you won or lost.
16. Close the game via the "Close game" button.


### Navigation Guide

- Backend API: [Ship/app/api/routes/](../Ship/app/api/routes/)
- Game logic: [Ship/app/crud/game_service.py](../Ship/app/crud/game_service.py)
- Tests: [Ship/tests/](../Ship/tests/)
- Security: [SECURITY_BRIEF.md](./SECURITY_BRIEF.md)


## Project Structure

```
📦 BattleShipV2/
│
├─ 📁 docs/                              # Documentation
│  ├─ README.md                          # Main project documentation (this file)
│  ├─ conceptual_overview.md             # High-level architecture & design decisions
│  ├─ API_DOCUMENTATION.md                   # API endpoint reference
│  ├─ CONTRIBUTING.md                    # Developer contribution guidelines
│  └─ SECURITY_BRIEF.md                   # Threat model & security controls│
├─ 📁 Ship/                              # FastAPI backend application
│  ├─ app/                               # Main application
│  │  ├─ main.py                         # FastAPI app initialization & middleware setup
│  │  ├─ config.py                       # Environment configuration & settings
│  │  ├─ exceptions.py                   # Custom exception classes
│  │  │
│  │  ├─ 📁 api/routes/                  # API endpoint handlers (organized by resource)
│  │  │  ├─ auth.py                      # Login, register, token refresh
│  │  │  ├─ games.py                     # Game creation, joining, attacks
│  │  │  ├─ boards.py                    # Board state & ship placement
│  │  │  ├─ ships.py                     # Ship management endpoints
│  │  │  ├─ users.py                     # User profile endpoints
│  │  │  ├─ bot_routes.py                # BOT opponent endpoints
│  │  │  └─ csrf_route.py                # CSRF token generation
│  │  │
│  │  ├─ 📁 crud/                        # Business logic & data operations
│  │  │  ├─ auth_service.py              # Password hashing, token generation
│  │  │  ├─ game_service.py              # Game logic, turn validation, attack validation
│  │  │  ├─ board_service.py             # Board state management
│  │  │  ├─ ship_service.py              # Ship placement & validation
│  │  │  ├─ user_service.py              # User profile operations
│  │  │  └─ bot_service.py               # BOT opponent logic
│  │  │
│  │  ├─ 📁 models/                      # SQLAlchemy ORM models (database schema)
│  │  │  ├─ users.py                     # User model (username, email, password hash)
│  │  │  ├─ game.py                      # Game model (state, players, turns)
│  │  │  ├─ board.py                     # Board model (grid state, owner)
│  │  │  └─ ship.py                      # Ship model (position, orientation, hits)
│  │  │
│  │  ├─ 📁 schemas/                     # Pydantic request/response validation schemas
│  │  │  ├─ users.py                     # User registration, profile schemas
│  │  │  ├─ game.py                      # Game creation, state schemas
│  │  │  ├─ board.py                     # Board state schemas
│  │  │  ├─ ship.py                      # Ship placement schemas
│  │  │  └─ token.py                     # JWT token schemas
│  │  │
│  │  ├─ 📁 middleware/                  # Request/response processing
│  │  │  └─ csrf.py                      # CSRF token validation
│  │  │
│  │  ├─ 📁 database/                    # Database connection & setup
│  │  │  └─ db_setup.py                  # SQLAlchemy engine, session factory
│  │  │
│  │  └─ 📁 utils/                       # Utility functions
│  │     └─ audit_logger.py              # Activity logging
│  │
│  ├─ 📁 alembic/                        # Database migration scripts (Alembic)
│  ├─ 📁 tests/                          # Test suite (currently examples)
│  │  ├─ conftest.py                     # Pytest fixtures & configuration
│  │  ├─ test_api.py                     # API endpoint integration tests
│  │  ├─ test_game_crud.py               # Game logic unit tests
│  │  ├─ test_example_game.py            # Full game flow integration test
│  │  └─ db_connection_test.py           # Database connectivity test
│  │
│  ├─ requirements.txt                   # Python production dependencies
│  ├─ requirements-dev.txt               # Development dependencies
│  ├─ .env.example                       # Environment variables template
│  ├─ .bandit                            # Bandit security scanning config
│  └─ truncate_databases.py              # Utility to clear test data(used in development)
│
├─ 📁 my-react-app/                      # React frontend application
│  ├─ 📁 src/
│  │  ├─ App.js                          # Root component, routing setup
│  │  ├─ index.js                        # React entry point
│  │  │
│  │  ├─ 📁 pages/                       # Full-page components (routed)
│  │  │  ├─ LandingPage.js               # Home page
│  │  │  ├─ RegisterPage.js              # Account creation
│  │  │  ├─ LoginPage.js                 # Authentication page
│  │  │  ├─ CreateGamePage.js            # New game creation form
│  │  │  ├─ BrowseGamesPage.js           # List games, to possibly join
│  │  │  ├─ GamePage.js                  # Active game board & controls
│  │  │  ├─ UserProfile.js               # Player profile
│  │  │  └─ ImpressumPage.js             # Legal information page
│  │  │
│  │  ├─ 📁 components/                  # Reusable UI components
│  │  │  ├─ Board.js                     # 10x10 game board grid
│  │  │  ├─ Cell.js                      # Individual board cell
│  │  │  ├─ Navbar.js                    # Navigation bar
│  │  │  ├─ Footer.js                    # Footer with links
│  │  │  ├─ GameOverPopup.js             # Win/loss modal
│  │  │  ├─ ConfirmModal.js              # Confirmation dialog
│  │  │  └─ ThemeToggle.js               # Dark/light mode switcher
│  │  │
│  │  ├─ 📁 utils/                       # Utility functions
│  │  │  ├─ api.js                       # Fetch wrapper for API calls
│  │  │  ├─ auth.js                      # JWT token management, login/logout
│  │  │  ├─ csrf.js                      # CSRF token handling
│  │  │  └─ errorHandler.js              # Global error handling
│  │  │
│  │  ├─ 📁 styles/                      # CSS stylesheets (organized by component)
│  │  │  ├─ Board.css, Cell.css, etc.
│  │  │  └─ variables.css                # CSS custom properties (colors, spacing)
│  │  │
│  │  └─ index.css                       # Global styles
│  │
│  ├─ public/                            # Static assets (HTML, icons, manifest)
│  ├─ package.json                       # npm dependencies & scripts
│  └─ .env.example                       # Frontend env template (API_URL, etc.)
│
├─ 📁 .github/workflows/                 # GitHub Actions CI/CD
│  └─ test.yml                           # Automated testing on push/PR
│
├─ .pre-commit-config.yaml               # Pre-commit hooks (black, flake8, bandit)
├─ .secrets.baseline                     # Detected secrets baseline
├─ .gitignore                            # Git ignore rules
└─ start.sh                              # Script to start both backend & frontend
```


---

## Technology Stack

### Backend
- **FastAPI** - Async Python web framework with automatic API docs
- **SQLAlchemy 2.0+** - ORM for type-safe database queries
- **PostgreSQL / SQLite** - Persistent data storage
- **JWT (HS256)** - Token-based stateless authentication
- **bcrypt** - Password hashing with automatic salt (cost 12)
- **Pydantic** - Runtime type validation and serialization

### Frontend
- **React** - Component-based UI library
- **Fetch API** - Native HTTP client for API calls
- **HTML5 Canvas / Grid** - Board rendering
- **localStorage** - Client-side token persistence

### Infrastructure
- **Render** - Hosting platform (auto-scaling, CI/CD)
- **GitHub Actions** - Automated testing & deployment

---

## Security Architecture

This project implements **STRIDE threat modeling** with mitigations for all attack vectors.

### Authentication & Authorization
- **Password Security:** bcrypt hashing with cost factor 12 (automatic salt, unique per password)
- **Rate Limiting:** Account lockout after 5 failed login attempts (5-minute duration)
- **JWT Tokens:** Signed with HMAC-SHA256, 30-minute expiry
- **Access Control:** Per-game authorization (verify user is player1 or player2)
- **Turn Validation:** Server enforces turn-based rules (player can only attack on their turn)

### Data Protection
- **CSRF Protection:** Double-submit cookie pattern on all state-changing requests
- **Input Validation:** Pydantic schemas validate all requests before processing
- **SQL Injection Prevention:** SQLAlchemy ORM parameterizes all queries (no raw SQL)
- **XSS Prevention:** React auto-escapes template expressions
- **Security Headers:** CSP, X-Frame-Options, HSTS configured

### Audit & Compliance
- **Activity Logging:** All authentication events, game actions, and authorization failures logged
- **Structured Format:** Logs include timestamp, user_id, action, IP address
- **Non-Repudiation:** Complete audit trail for compliance audits

**Detailed threat model:** See [SECURITY_BRIEF.md](./SECURITY_BRIEF.md)

---

## Current Limitations & Future Plans

### Current Limitations
- Rate limiting is per-account only
- No request rate limiting on game endpoints
- In-memory login tracking (Redis?)
- No persistent session store

### Planned Features
- [ ] Spectator mode (watch ongoing games)
- [ ] Game history and analytics
- [ ] Statistics dashboard on profile page
- [ ] change account settings (reset password)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Branch strategy (`feature/`, `bugfix/`)
- Commit message format
- PR review checklist
- Code style (black, flake8, mypy)

**Quick contribute:**
```bash
git checkout -b feature/your-feature
# Make changes
git commit -m "feat: describe your change"
git push origin feature/your-feature
# Create PR on GitHub
```
