import pytest
import os
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the root directory of the project to sys.path
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.db_setup import Base, get_engine

load_dotenv()  # Load environment variables

# Set the environment to "test" for tests
os.environ["ENVIRONMENT"] = "test"

@pytest.fixture(scope="function")
def test_db():
    """Create a test database session."""
    engine = get_engine()
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db  # Provide the test database session
    finally:
        db.close()
        Base.metadata.drop_all(engine)  # Drop all tables after the test
        engine.dispose()

@pytest.fixture(scope="function")
def override_test_db(test_db):
    """Override the get_db dependency in the main app."""
    from app.main import app
    from app.database.db_setup import get_db

    def _get_db():
        yield test_db

    app.dependency_overrides[get_db] = _get_db

    yield

    app.dependency_overrides.clear()