import logging
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()  # Load environment variables

# Enable SQLAlchemy logging
logging.basicConfig()
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)  # Log all SQL queries


# Determine the environment (default production)
def get_database_url():
    environment = os.getenv("ENVIRONMENT", "production")
    logging.warning(f"Current ENVIRONMENT: {environment}")  # Log the current environment
    if environment == "test":
        database_url = os.getenv("TEST_DATABASE_URL")
        if not database_url:
            raise ValueError("TEST_DATABASE_URL must be set for running tests.")
        return database_url
    else:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL must be set for running in production.")
        return database_url


# Dynamically create the engine
def get_engine():
    database_url = get_database_url()
    logging.info(f"Connecting to database at {database_url}")
    return create_engine(database_url, future=True)


# Dynamically create the session factory
def get_session_local():
    engine = get_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


# Declarative base
Base = declarative_base()


# Dependency for getting a database session
def get_db():
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logging.error(f"Transaction rolled back due to: {e}")
        db.rollback()
        raise
    finally:
        db.close()
