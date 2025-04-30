import psycopg2
import pytest

DATABASE_URLS = [
    "postgresql://battleship_user:battleship_pass@localhost:5432/battleship",
    "postgresql://mytestuser:mytestpassword@localhost:5432/testdb"
]

EXPECTED_USERS = [
    {"username": "battleship_user", "has_create_privilege": True},
    {"username": "mytestuser", "has_create_privilege": True}
]

@pytest.mark.parametrize("database_url", DATABASE_URLS)
def test_database_connection(database_url):
    try:
        conn = psycopg2.connect(database_url)
        conn.close()
    except Exception as e:
        assert False, f"Database connection failed for {database_url}: {e}"

@pytest.mark.parametrize("database_url,expected_user", zip(DATABASE_URLS, EXPECTED_USERS))
def test_user_permissions(database_url, expected_user):
    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        # Check if the user exists
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (expected_user["username"],))
        user_exists = cursor.fetchone()
        assert user_exists, f"User {expected_user['username']} does not exist in the database."

        # Check user permissions (example: CREATE privilege)
        cursor.execute(
            "SELECT has_database_privilege(%s, current_database(), 'CREATE')",
            (expected_user["username"],)
        )
        has_create_privilege = cursor.fetchone()[0]
        assert has_create_privilege == expected_user["has_create_privilege"], (
            f"User {expected_user['username']} CREATE privilege mismatch. "
            f"Expected: {expected_user['has_create_privilege']}, Found: {has_create_privilege}"
        )

        cursor.close()
        conn.close()
    except Exception as e:
        assert False, f"Permission check failed for {database_url} and user {expected_user['username']}: {e}"
