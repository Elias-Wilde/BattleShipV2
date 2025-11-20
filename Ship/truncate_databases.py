import os

from dotenv import load_dotenv
from sqlalchemy import MetaData, create_engine, text

load_dotenv()  # Load environment variables


def truncate_and_reset_sequences(database_url: str):
    """Truncates all tables and resets sequences in the specified database."""
    engine = create_engine(database_url)
    meta = MetaData()
    meta.reflect(bind=engine)
    with engine.connect() as connection:
        transaction = connection.begin()  # Start a transaction
        try:
            print(f"Connected to database: {database_url}")
            for table in reversed(meta.sorted_tables):
                print(f"Truncating table {table.name}...")
                connection.execute(text(f"TRUNCATE TABLE {table.name} CASCADE;"))

                # Reset the sequence for the table's primary key
                if table.primary_key:
                    for column in table.primary_key.columns:
                        sequence_name = f"{table.name}_{column.name}_seq"
                        # Check if the sequence exists
                        result = connection.execute(
                            text("SELECT COUNT(*) FROM pg_class WHERE relname = :sequence_name"),  # nosec B608
                            {"sequence_name": sequence_name},
                        ).scalar()
                        if result == 1:  # Sequence exists
                            print(f"Resetting sequence {sequence_name}...")
                            connection.execute(text(f"ALTER SEQUENCE {sequence_name} RESTART WITH 1;"))
                        else:
                            print(f"Sequence {sequence_name} does not exist. Skipping.")
            transaction.commit()  # Commit the transaction
            print(f"All data in the database at {database_url} has been truncated and sequences reset.")
        except Exception as e:
            transaction.rollback()  # Rollback the transaction on error
            print(f"Failed to truncate table or reset sequences: {e}")


if __name__ == "__main__":
    # Truncate the production database
    production_db_url = os.getenv("DATABASE_URL")
    if production_db_url:
        print("Truncating production database...")
        truncate_and_reset_sequences(production_db_url)
    else:
        print("DATABASE_URL is not set. Skipping production database.")

    # Truncate the test database
    test_db_url = os.getenv("TEST_DATABASE_URL")
    if test_db_url:
        print("Truncating test database...")
        truncate_and_reset_sequences(test_db_url)
    else:
        print("TEST_DATABASE_URL is not set. Skipping test database.")
