# Contributing to BattleShip

This document outlines the process for contributing code, documentation, or bug reports.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Testing](#testing)
5. [Commit Messages](#commit-messages)
6. [Pull Request Process](#pull-request-process)
7. [Documentation](#documentation)
8. [Security Considerations](#security-considerations)

---

## Getting Started

### Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- **PostgreSQL 13+** or SQLite (for local development)
- **Git**

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/BattleShipV2.git # for main branch
   cd BattleShipV2
   ```

2. **Set up the backend**
   ```bash
   cd Ship
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate

   pip install -r requirements-dev.txt
   cp .env.example .env
   # Edit .env with your settings

   # Run migrations
   alembic upgrade head

   # Start the server
   uvicorn app.main:app --reload
   ```

3. **Set up the frontend**
   ```bash
   cd ../my-react-app
   npm install
   npm start
   ```

4. **Verify everything works**
   - Backend API: http://localhost:8000
   - Swagger docs: http://localhost:8000/docs
   - Frontend: http://localhost:3000

---

## Development Workflow

### Branch Naming Convention

Use descriptive branch names following this pattern:

```
<type>/<description>
```

**Types:**
- `feature/` - New functionality (e.g., `feature/spectator-mode`)
- `bugfix/` - Bug fixes (e.g., `bugfix/ship-overlap-validation`)
- `docs/` - Documentation updates (e.g., `docs/update-api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/simplify-attack-logic`)
- `test/` - Test additions (e.g., `test/add-integration-tests`)
- `chore/` - Maintenance (e.g., `chore/upgrade-dependencies`)

**Examples:**
```bash
git checkout -b feature/spectator-mode
git checkout -b bugfix/concurrent-attack-validation
git checkout -b docs/api-reference
```

### Creating a Feature Branch

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create and switch to your feature branch
git checkout -b feature/your-feature-name

# Make your changes
# Commit frequently with clear messages (see Commit Messages section)
# Push to your fork
git push origin feature/your-feature-name
```

---

## Code Standards

### Python Code Style

We follow **PEP 8** with tools to enforce consistency.

**Tools Used:**
- **black** - Code formatter (line length: 120 characters)
- **flake8** - Linter (max line length: 120)
- **isort** - Import sorting
- **mypy** - Type checking
- **bandit** - Security scanning

**Run locally before committing:**
```bash
cd Ship

# Format code with black
black app/ tests/

# Check imports
isort app/ tests/

# Lint with flake8
flake8 app/ tests/

# Type check with mypy
mypy app/ --ignore-missing-imports

# Security check with bandit
bandit -r app/
```

**Or use pre-commit hooks:**
```bash
# Install pre-commit
pip install pre-commit

# Install the git hooks
pre-commit install

# Now hooks run automatically on every commit
```

### Style Guide Examples

**Naming Conventions**
```python
user_id = 1
board_state = [[...]]
def validate_ship_placement():
    pass

class GameService:
    pass
```

**Type Hints**
```python
def create_game(db: Session, player1_id: int) -> Game:
    ...

def get_users(skip: int = 0, limit: int = 100) -> list[User]:
    ...
```

**Docstrings**
```python
def attack(db: Session, game_id: int, player_id: int, coordinates: list[int]) -> Game:
    """
    Process an attack on opponent's board.

    Args:
        db: Database session
        game_id: ID of the game
        player_id: ID of attacking player
        coordinates: [row, col] (0-9 each)

    Returns:
        Updated game object

    Raises:
        ValidationError: If coordinates invalid or already attacked
        PermissionError: If not player's turn
        NotFoundError: If game not found
    """
    ...
```

**Line Length**
```python
# wrapped
user = db.query(User).filter(
    User.username == username
).filter(
    User.email == email
).first()
```

### JavaScript/React Code Style

We follow **Airbnb JavaScript Style Guide** for React code.

**Key Rules:**
- Use functional components
- Use hooks for state management
- Prop validation with PropTypes or TypeScript

**Example:**
```javascript
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const GameBoard = ({ gameId, playerToken }) => {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchBoard(gameId, playerToken).then((data) => {
      setBoard(data);
      setLoading(false);
    });
  }, [gameId, playerToken]);

  if (loading) return <div>Loading...</div>;
  return <div>{/* board UI */}</div>;
};

GameBoard.propTypes = {
  gameId: PropTypes.number.isRequired,
  playerToken: PropTypes.string.isRequired,
};

export default GameBoard;
```

---

## Testing

### Running Tests

**Backend:**
```bash
cd Ship

# Run all tests
pytest

# Run specific test file
pytest tests/test_api.py

# Run with coverage report
pytest --cov=app tests/

# Run with verbose output
pytest -v

# Run only integration tests
pytest tests/test_example_game.py -v
```

**Frontend:**
```bash
cd my-react-app

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- GameBoard.test.js
```

### Writing Tests

**Backend Unit Test Example:**
```python
# tests/test_game_crud.py
import pytest
from app.crud.game_service import validate_attack_coordinates

def test_attack_coordinates_valid():
    """Valid coordinates should pass validation."""
    assert validate_attack_coordinates([0, 0]) == True
    assert validate_attack_coordinates([9, 9]) == True
    assert validate_attack_coordinates([5, 5]) == True

def test_attack_coordinates_invalid():
    """Invalid coordinates should fail validation."""
    assert validate_attack_coordinates([-1, 0]) == False
    assert validate_attack_coordinates([10, 5]) == False
    assert validate_attack_coordinates([5]) == False  # Wrong format
    assert validate_attack_coordinates("5,5") == False  # Wrong type

def test_attack_coordinates_out_of_bounds():
    """Out-of-bounds coordinates should fail."""
    assert validate_attack_coordinates([10, 10]) == False
    assert validate_attack_coordinates([0, 10]) == False
    assert validate_attack_coordinates([10, 0]) == False
```

**Backend Integration Test Example:**
```python
# tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_game_requires_auth():
    """Creating a game requires authentication."""
    response = client.post("/games/", json={"player1_id": 1})
    assert response.status_code == 401

def test_create_game_success(auth_token):
    """Authenticated user can create a game."""
    response = client.post(
        "/games/?player1_id=1",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["game_id"] is not None
    assert data["player1_id"] == 1
    assert data["game_status"] == "waiting"
```

**Frontend Test Example:**
```javascript
// my-react-app/src/components/__tests__/Cell.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import Cell from '../Cell';

test('Cell renders with correct state', () => {
  render(<Cell row={0} col={0} value="O" onClick={() => {}} />);
  const cell = screen.getByRole('button');
  expect(cell).toBeInTheDocument();
});

test('Cell calls onClick handler when clicked', () => {
  const handleClick = jest.fn();
  render(<Cell row={0} col={0} value="O" onClick={handleClick} />);
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledWith(0, 0);
});
```
---

## Commit Messages

Follow the **Conventional Commits** format for clear, consistent history.

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting, missing semicolons)
- `refactor:` - Code refactoring without feature changes
- `perf:` - Performance improvements
- `test:` - Adding/updating tests
- `chore:` - Build, dependencies, tooling
- `security:` - Security fixes or improvements

**Scope:** (optional) What part of the code
- `auth`, `game`, `board`, `ships`, `api`, etc.


**Body:**
- Explain *what* and *why*, not *how*
- Use bullet points if multiple changes

**Footer:**
- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`

**Examples:**
```
feat(game): add surrendering functionality

Players can now surrender mid-game to concede immediately.
Opponent is set as winner when surrender is processed.

- Add surrender endpoint POST /games/{game_id}/surrender
- Update game status to "finished" and set winner_id
- Log surrender action for audit trail

Closes #42
```

---

## Pull Request Process

### Before Creating a PR

1. **Ensure your code is clean**
   ```bash
   # Backend
   cd Ship
   black app/ tests/
   isort app/ tests/
   flake8 app/ tests/
   mypy app/ --ignore-missing-imports

   # Frontend
   cd ../my-react-app
   npm run lint
   npm run format
   ```

2. **Run tests locally**
   ```bash
   # Backend
   cd Ship
   pytest

   # Frontend
   cd ../my-react-app
   npm test
   ```

3. **Update documentation** if your change affects:
   - API endpoints
   - Database schema
   - User-facing features
   - Architecture decisions

### Creating a PR

1. **Push your branch to GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a PR on GitHub** with:
   - **Title:** Descriptive, follows commit format
   - **Description:** Explain what changed and why

**PR Description Template:**
```markdown
## Description
Brief description of the change.

## Related Issues
Closes #123

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No breaking changes
```

### After Approval

- Squash commits if requested
- Rebase on main if needed
- Maintainer will merge
- Delete your branch after merge

---

## Documentation

### Updating Documentation

If your change affects:

**API Endpoints:**
- Update `/docs/api_reference.md`
- Include endpoint path, method, parameters, response examples
- Add error responses

**Architecture:**
- Update `/docs/conceptual_overview.md`
- Update diagrams if needed

**User-Facing Features:**
- Update `/docs/README.md` Quick Start section
- Add screenshots if helpful

**Security:**
- Update `/docs/SECURITY_BRIEF.md` if security-relevant

---

## Security Considerations

### When Contributing Code

**Always consider:**

1. **Authentication/Authorization**
   - Verify user owns resource before modifying
   - Check authentication on protected endpoints
   - Use `get_current_user_from_token()` for protected routes

2. **Input Validation**
   - Use Pydantic schemas for request validation
   - Validate coordinates, IDs, user inputs
   - Never trust client input

3. **SQL Injection Prevention**
   - Always use SQLAlchemy ORM
   - Never construct raw SQL strings

4. **XSS Prevention** (Frontend)
   - React auto-escapes template expressions
   - Never use `dangerouslySetInnerHTML`

5. **Rate Limiting**
   - Consider rate limits on expensive operations
   - Implement timeouts for long-running processes

6. **Logging**
   - Log security events (failed auth, authorization failures)
   - Don't log passwords or tokens
   - Include user_id, timestamp, action


---

## Getting Help

- **Questions:** Check existing issues/documentation first
