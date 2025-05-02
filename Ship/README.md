# BattleShip Backend

This is the backend for the multiplayer Battleship game, built with **FastAPI** and **PostgreSQL**. It provides RESTful APIs for user authentication, game management, and bot interactions.

---

## Prerequisites

Before running the backend locally, ensure you have the following installed:
- **Python 3.10+**
- **PostgreSQL 14+**
- **Git**

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone
cd your-repo/Ship
```

### 2. Create a Virtual Environment
```bash
python -m venv venv
```

### 3. Activate the Virtual Environment
  ```bash
  source venv/bin/activate
  ```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Set Up the Database
1. Start PostgreSQL and create a new database:
   ```bash
   psql -U postgres
   CREATE DATABASE battleship;
   ```

2. Create a `.env` file in the `Ship` directory with the following content:
   ```
   DATABASE_URL=postgresql+psycopg2://username:password@localhost:5432/battleship
   ENVIROMENT=production
   SECRET_KEY=your_secret_key
   ```

3. Run database migrations:
   ```bash
   alembic upgrade head
   ```
---
### 6. Start the Backend Server
```bash
uvicorn app.main:app --reload
```
The backend will be available at `http://localhost:8000`.

---

## API Endpoints

For a full list of endpoints, visit the Swagger UI at `http://localhost:8000/docs`.

---


## Testing

Run the backend tests using `pytest`:
```bash
pytest
```

---
