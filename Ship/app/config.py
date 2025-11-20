import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg2://battleship_user:battleship_pass@localhost:5432/battleship"
)
SECRET_KEY = os.getenv("SECRET_KEY", "my-secret-key")
