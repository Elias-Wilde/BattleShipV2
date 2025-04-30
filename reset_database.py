from sqlalchemy import create_engine, text
from app.database.db_setup import get_database_url

def reset_database():
    database_url = get_database_url()
    engine = create_engine(database_url)

    with engine.connect() as connection:
        # Drop all tables
        connection.execute(text("""
        DO $$ DECLARE
            table_name text;
        BEGIN
            FOR table_name IN
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
            LOOP
                EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
            END LOOP;
        END $$;
        """))

        # Reset all sequences
        connection.execute(text("""
        DO $$ DECLARE
            seq_name text;
        BEGIN
            FOR seq_name IN
                SELECT c.relname
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relkind = 'S' AND n.nspname = 'public'
            LOOP
                EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq_name);
            END LOOP;
        END $$;
        """))

    print("Database reset complete.")

if __name__ == "__main__":
    reset_database()