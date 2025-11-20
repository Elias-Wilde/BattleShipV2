"""
5 Simple Integration Tests for BattleShip V2

Each test is self-contained and uses a fresh database.
Focus: Verify core API functionality works.
"""


def test_user_registration(client):
    """TEST 1: User can register successfully."""
    response = client.post("/users/", json={"username": "alice", "email": "alice@test.com", "password": "Password123"})

    assert response.status_code == 201
    user = response.json()
    assert user["username"] == "alice"
    assert user["email"] == "alice@test.com"
    assert "user_id" in user


def test_user_login(client):
    """TEST 2: User can login and receive access token."""
    # Register user
    client.post("/users/", json={"username": "bob", "email": "bob@test.com", "password": "Password123"})

    # Login
    response = client.post("/auth/login", data={"username": "bob", "password": "Password123"})

    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


def test_game_creation(client):
    """TEST 3: User can create a new game."""
    # Register user
    user_resp = client.post(
        "/users/", json={"username": "charlie", "email": "charlie@test.com", "password": "Password123"}
    )
    user_id = user_resp.json()["user_id"]

    # Login to get token
    login_resp = client.post("/auth/login", data={"username": "charlie", "password": "Password123"})
    token = login_resp.json()["access_token"]

    # Create game with auth header
    game_resp = client.post(f"/games/?player1_id={user_id}", headers={"Authorization": f"Bearer {token}"})

    assert game_resp.status_code == 201
    game = game_resp.json()
    assert game["player1_id"] == user_id
    assert game["game_status"] == "waiting"
    assert "game_id" in game


def test_duplicate_username_error(client):
    """TEST 4: Duplicate username is rejected with 409 error."""
    # Register first user
    client.post("/users/", json={"username": "david", "email": "david1@test.com", "password": "Password123"})

    # Try to register same username (different email)
    response = client.post("/users/", json={"username": "david", "email": "david2@test.com", "password": "Password123"})

    assert response.status_code == 409


def test_csrf_endpoint_accessible(client):
    """TEST 5: CSRF token endpoint is accessible."""
    response = client.get("/api/csrf-token")

    # Should return 200 OK
    assert response.status_code == 200
