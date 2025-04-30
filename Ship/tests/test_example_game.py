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

    assert player1_board["board_state"] == [["O"] * 10 for _ in range(10)], "Board 1 creation failed"
    assert player2_board["board_state"] == [["O"] * 10 for _ in range(10)], "Board 2 creation failed"

    # 5. Place ships for both players
    def place_ships(board_id, ships):
        for ship in ships:
            response = requests.post(
                f"{BASE_URL}/ships/",
                json={"board_id": board_id, "ship_type": ship["type"], "ship_coordinates": ship["coordinates"]},
            )
            assert response.status_code == 201, f"Failed to place ship: {ship['type']}"

    player1_ships = [
        {"type": "destroyer", "coordinates": [[0, 0], [0, 1]]},
        {"type": "cruiser", "coordinates": [[2, 2], [2, 3], [2, 4]]},
    ]
    player2_ships = [
        {"type": "destroyer", "coordinates": [[5, 5], [5, 6]]},
        {"type": "cruiser", "coordinates": [[7, 7], [7, 8], [7, 9]]},
    ]

    place_ships(player1_board["board_id"], player1_ships)
    place_ships(player2_board["board_id"], player2_ships)

    # 6. Lock both boards
    def lock_board(board_id, board_state):
        response = requests.put(
            f"{BASE_URL}/boards/{board_id}",
            json={"board_state": board_state, "board_status": "locked"},
        )
        assert response.status_code == 200, "Failed to lock board"

    lock_board(player1_board["board_id"], player1_board["board_state"])
    lock_board(player2_board["board_id"], player2_board["board_state"])

    # 7. Start the game
    game = requests.put(f"{BASE_URL}/games/{game['game_id']}/start").json()
    assert game["game_status"] == "playing", "Game did not transition to 'playing' state"
    assert game["turn"] == player1["user_id"], "Player 1 should start the game"

    def attack(game_id, player_id, coordinates):
            response = requests.post(
                f"{BASE_URL}/games/{game_id}/attack?player_id={player_id}",
                json={"coordinates": coordinates},
            )
            assert response.status_code == 200, f"Attack failed for player {player_id} at {coordinates}"
            return response.json()

    attack1 = attack(game["game_id"], player1["user_id"], [5, 5])  # Player 1 hits
    assert attack1["turn"] == player2["user_id"], "Turn did not switch to Player 2"

    attack2 = attack(game["game_id"], player2["user_id"], [0, 0])  # Player 2 hits
    assert attack2["turn"] == player1["user_id"], "Turn did not switch to Player 1"

    attack3 = attack(game["game_id"], player1["user_id"], [5, 6])  # Player 1 hits
    assert attack3["turn"] == player2["user_id"], "Turn did not switch to Player 2"

    attack4 = attack(game["game_id"], player2["user_id"], [2, 2])  # Player 2 hits
    assert attack4["turn"] == player1["user_id"], "Turn did not switch to Player 1"

    attack5 = attack(game["game_id"], player1["user_id"], [7, 7])  # Player 1 hits
    assert attack5["turn"] == player2["user_id"], "Turn did not switch to Player 2"

    attack6 = attack(game["game_id"], player2["user_id"], [2, 3])  # Player 2 hits
    assert attack6["turn"] == player1["user_id"], "Turn did not switch to Player 1"

    attack7 = attack(game["game_id"], player1["user_id"], [7, 8])  # Player 1 hits
    assert attack7["turn"] == player2["user_id"], "Turn did not switch to Player 2"

    attack8 = attack(game["game_id"], player2["user_id"], [2, 4])  # Player 2 hits
    assert attack8["turn"] == player1["user_id"], "Turn did not switch to Player 1"

    attack9 = attack(game["game_id"], player1["user_id"], [7, 9])  # Player 1 wins

    assert attack9["game_status"] == "finished", "Game did not finish correctly"
    assert attack9["winner_id"] == player1["user_id"], "Player 1 did not win the game"
