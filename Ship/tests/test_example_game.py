import pytest
import requests
import time
import os
from app.database.db_setup import get_database_url

BASE_URL = "http://127.0.0.1:8000"


@pytest.mark.usefixtures("override_test_db")
def test_database_url_is_test():
    database_url = get_database_url()
    assert "testdb" in database_url, f"Expected test database URL, but got {database_url}"


def test_environment_is_test():
    """Verify that the ENVIRONMENT variable is set to 'test'."""
    assert os.getenv("ENVIRONMENT") == "test", f"Expected ENVIRONMENT to be 'test', but got {os.getenv('ENVIRONMENT')}"


from app.database.db_setup import get_database_url

def test_database_url_is_test():
    """Verify that the database URL is the test database."""
    database_url = get_database_url()
    assert "testdb" in database_url, f"Expected test database URL, but got {database_url}"


@pytest.mark.usefixtures("override_test_db")
def test_api_example_game():
    """Test the API game flow."""
    # 1. Create two users
    player1_username = f"player1_{int(time.time())}"
    player2_username = f"player2_{int(time.time())}"
    player1 = requests.post(
        f"{BASE_URL}/users/",
        json={"username": player1_username, "email": f"{player1_username}@test.com", "password": "testpassword"},
    ).json()
    player2 = requests.post(
        f"{BASE_URL}/users/",
        json={"username": player2_username, "email": f"{player2_username}@test.com", "password": "testpassword"},
    ).json()
    assert player1["user_id"] is not None, "Player 1 creation failed"
    assert player2["user_id"] is not None, "Player 2 creation failed"

    # 2. Create the game
    user_id1 = player1["user_id"]
    game = requests.post(f"{BASE_URL}/games/?player1_id={user_id1}").json()

    # 3. Second player joins the game
    game = requests.put(f"{BASE_URL}/games/{game['game_id']}/join?player2_id={player2['user_id']}").json()
    assert game["game_status"] == "in_progress", "Game did not start correctly"

    # 4. verify player joined and boards got created
    player1_board = requests.get(f"{BASE_URL}/boards/{game['game_id']}/{player1['user_id']}").json()
    player2_board = requests.get(f"{BASE_URL}/boards/{game['game_id']}/{player2['user_id']}").json()

    board_id1 = player1_board["board_id"]
    board_id2 = player2_board["board_id"]

    print(f"Player 1 Board: {player1_board}")
    print(f"Player 2 Board: {player2_board}")

    assert player1_board["board_state"] == [["O"] * 10 for _ in range(10)], "Board 1 creation failed"
    assert player2_board["board_state"] == [["O"] * 10 for _ in range(10)], "Board 2 creation failed"

    # 5. Place ships
    ship1_player1 = requests.post(
        f"{BASE_URL}/ships/",
        json={"board_id": board_id1, "ship_type": "destroyer", "ship_coordinates": [[0, 0], [0, 1]]},
    ).json()
    ship2_player1 = requests.post(
        f"{BASE_URL}/ships/",
        json={"board_id": board_id1, "ship_type": "cruiser", "ship_coordinates": [[2, 2], [2, 3], [2, 4]]},
    ).json()
    ship1_player2 = requests.post(
        f"{BASE_URL}/ships/",
        json={"board_id": board_id2, "ship_type": "destroyer", "ship_coordinates": [[5, 5], [5, 6]]},
    ).json()
    ship2_player2 = requests.post(
        f"{BASE_URL}/ships/",
        json={"board_id": board_id2, "ship_type": "cruiser", "ship_coordinates": [[7, 7], [7, 8], [7, 9]]},
    ).json()

    # 6. Attack sequence (swap turn each attack)
    attack1 = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/attack?player_id={player1['user_id']}",
        json={"coordinates": [5, 5]},
    ).json()  # Player 1 hits

    game_after_attack1 = requests.get(f"{BASE_URL}/games/{game['game_id']}").json()

    all_board_2_ships = requests.get(
        f"{BASE_URL}/ships/{board_id2}").json()
    print(all_board_2_ships)
    print(game_after_attack1)
    assert attack1["turn"] == player2["user_id"], "Turn did not switch to Player 2"

    attack2 = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/attack?player_id={player2['user_id']}",
        json={"coordinates": [0, 0]},
    ).json()  # Player 2 hits
    assert attack2["turn"] == player1["user_id"], "Turn did not switch to Player 1"

    attack3 = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/attack?player_id={player1['user_id']}",
        json={"coordinates": [5, 6]},
    ).json()  # Player 1 sinks
    assert attack3["turn"] == player2["user_id"], "Turn did not switch to Player 2"

    attack4 = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/attack?player_id={player2['user_id']}",
        json={"coordinates": [2, 2]},
    ).json()

    attack5 = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/attack?player_id={player1['user_id']}",
        json={"coordinates": [7, 7]},
    ).json()

    attack6 = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/attack?player_id={player2['user_id']}",
        json={"coordinates": [2, 3]},
    ).json()

    attack7 = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/attack?player_id={player1['user_id']}",
        json={"coordinates": [7, 8]},
    ).json()

    attack8 = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/attack?player_id={player2['user_id']}",
        json={"coordinates": [2, 4]},
    ).json()

    attack9 = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/attack?player_id={player1['user_id']}",
        json={"coordinates": [7, 9]},
    ).json()  # Player 1 wins

    assert attack9["game_status"] == "finished", "Game did not finish correctly"
    assert attack9["winner_id"] == player1["user_id"], "Player 1 did not win the game"
