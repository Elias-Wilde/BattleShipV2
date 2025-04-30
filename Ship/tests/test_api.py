import pytest
import requests
from sqlalchemy.orm import Session
import time

BASE_URL = "http://127.0.0.1:8000"

@pytest.mark.usefixtures("test_db")
def test_create_user(test_db: Session):
    unique_username = f"testuser_{int(time.time())}"
    response = requests.post(f"{BASE_URL}/users/", json={
        "username": unique_username,
        "email": f"{unique_username}@example.com",
        "password": "testpassword"
    })
    assert response.status_code == 201
    assert "user_id" in response.json()


@pytest.mark.usefixtures("test_db")
def test_create_game(test_db: Session):
    # need to have user
    unique_username = f"player1_{int(time.time())}"
    response_user = requests.post(f"{BASE_URL}/users/", json={
        "username": unique_username,
        "email": f"{unique_username}@example.com",
        "password": "testpassword"
    })

    user_id = response_user.json()["user_id"]
    response = requests.post(f"{BASE_URL}/games/?player1_id={user_id}")
    assert response.status_code == 201
    assert "game_id" in response.json()


@pytest.mark.usefixtures("test_db")
def test_user_authentication(test_db: Session):
    # create a user
    unique_username = f"authuser_{int(time.time())}"
    user_response = requests.post(f"{BASE_URL}/users/", json={
        "username": unique_username,
        "email": f"{unique_username}@example.com",
        "password": "testpassword"
    })
    assert user_response.status_code == 201
    user_data = user_response.json()
    assert "user_id" in user_data

    # login with the created user
    login_response = requests.post(f"{BASE_URL}/auth/login", data={
        "username": unique_username,
        "password": "testpassword"
    })
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # use the token to access a protected route
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_response = requests.get(f"{BASE_URL}/users/users/me", headers=headers)
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["username"] == unique_username
    assert me_data["email"] == f"{unique_username}@example.com"

    # invalid token test
    invalid_headers = {"Authorization": "Bearer invalid_token"}
    invalid_response = requests.get(f"{BASE_URL}/users/users/me", headers=invalid_headers)
    assert invalid_response.status_code == 401
    assert invalid_response.json()["detail"] == "Invalid authentication token"