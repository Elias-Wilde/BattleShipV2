"""
Minimal test configuration for BattleShip V2
"""

import os
import sys
from pathlib import Path

import pytest

# Setup path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Create test database file
test_db_path = Path(__file__).parent / "test_temp.db"
test_db_url = f"sqlite:///{test_db_path}"

# Environment setup BEFORE importing app
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-12345"
os.environ["DATABASE_URL"] = test_db_url  # Use test DB
os.environ["TEST_DATABASE_URL"] = test_db_url  # Also set this
os.environ["SKIP_CSRF"] = "true"  # Disable CSRF
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"  # JWT expiry in minutes

from app.database.db_setup import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models.board import Board  # noqa: E402, F401
from app.models.game import Game  # noqa: E402, F401
from app.models.ship import Ship  # noqa: E402, F401
from app.models.users import User  # noqa: E402, F401
from sqlalchemy import create_engine  # noqa: E402


@pytest.fixture(scope="function", autouse=True)
def setup_test_db():
    """
    Setup fresh test database for each test.
    Clears all tables before and after each test.
    """
    # Create engine and tables
    engine = create_engine(test_db_url)
    Base.metadata.create_all(bind=engine)

    yield

    # Cleanup: drop all tables
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def client(setup_test_db):
    """
    Test client that uses the test database.
    """
    from fastapi.testclient import TestClient

    test_client = TestClient(app, base_url="http://testclient")

    yield test_client
