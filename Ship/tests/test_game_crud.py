import pytest
from sqlalchemy.orm import Session
from app.crud import user_service, game_service, board_service, ship_service
from app.schemas.users import UserCreate
from app.schemas.board import BoardCreate
from app.schemas.ship import ShipCreate
from typing import List

@pytest.mark.usefixtures("test_db")
def test_game_flow_crud(test_db: Session):
    # 1. Create two users
    player1_data = UserCreate(username="player1_crud", email="player1_crud@test.com", password="testpassword")
    player2_data = UserCreate(username="player2_crud", email="player2_crud@test.com", password="testpassword")

    player1 = user_service.create_user(test_db, player1_data)
    player2 = user_service.create_user(test_db, player2_data)

    assert player1.user_id is not None
    assert player2.user_id is not None

    # 2. Create a game
    game = game_service.create_game(test_db, player1.user_id)
    assert game.game_status == "waiting"
    assert game.player1_id == player1.user_id

    # 3. Join the game
    game = game_service.join_game(test_db, game.game_id, player2.user_id)
    assert game.game_status == "in_progress"
    assert game.turn == player1.user_id

    # 4. check boards have been created
    board1 = board_service.get_board_by_game_and_player(test_db, game.game_id, player1.user_id)
    board2 = board_service.get_board_by_game_and_player(test_db, game.game_id, player2.user_id)

    assert board1.board_id is not None
    assert board2.board_id is not None

    # 5. Place ships
    ship1_data = ShipCreate(board_id=board1.board_id, ship_type="destroyer", ship_coordinates=[[0, 0], [0, 1]])
    ship2_data = ShipCreate(board_id=board1.board_id, ship_type="cruiser", ship_coordinates=[[2, 2], [2, 3], [2, 4]])
    ship3_data = ShipCreate(board_id=board2.board_id, ship_type="destroyer", ship_coordinates=[[5, 5], [5, 6]])
    ship4_data = ShipCreate(board_id=board2.board_id, ship_type="cruiser", ship_coordinates=[[7, 7], [7, 8], [7, 9]])

    ship1_player1 = ship_service.create_ship(test_db, ship1_data)
    ship2_player1 = ship_service.create_ship(test_db, ship2_data)
    ship1_player2 = ship_service.create_ship(test_db, ship3_data)
    ship2_player2 = ship_service.create_ship(test_db, ship4_data)

    assert ship1_player1.ship_id is not None
    assert ship2_player1.ship_id is not None
    assert ship1_player2.ship_id is not None
    assert ship2_player2.ship_id is not None

    # 6. Attack sequence
    attack1 = game_service.attack(test_db, game.game_id, player1.user_id, [5, 5])  # Player 1 hits
    assert attack1.turn == player2.user_id  # Verify turn switches
    assert board_service.get_board(test_db, board2.board_id).board_state[5][5] == "H"

    attack2 = game_service.attack(test_db, game.game_id, player2.user_id, [0, 0])  # Player 2 hits
    assert attack2.turn == player1.user_id
    assert board_service.get_board(test_db, board1.board_id).board_state[0][0] == "H"

    attack3 = game_service.attack(test_db, game.game_id, player1.user_id, [5, 6])  # Player 1 hits
    assert attack3.turn == player2.user_id
    assert board_service.get_board(test_db, board2.board_id).board_state[5][6] == "H"

    attack4 = game_service.attack(test_db, game.game_id, player2.user_id, [2, 2])  # Player 2 hits
    assert attack4.turn == player1.user_id
    assert board_service.get_board(test_db, board1.board_id).board_state[2][2] == "H"

    attack5 = game_service.attack(test_db, game.game_id, player1.user_id, [7, 7])  # Player 1 hits
    assert attack5.turn == player2.user_id
    assert board_service.get_board(test_db, board2.board_id).board_state[7][7] == "H"

    attack6 = game_service.attack(test_db, game.game_id, player2.user_id, [0, 5])  # Player 2 miss
    assert attack6.turn == player1.user_id
    assert board_service.get_board(test_db, board1.board_id).board_state[0][5] == "M"

    attack7 = game_service.attack(test_db, game.game_id, player1.user_id, [7, 8])  # Player 1 hits
    assert attack7.turn == player2.user_id
    assert board_service.get_board(test_db, board2.board_id).board_state[7][8] == "H"

    attack8 = game_service.attack(test_db, game.game_id, player2.user_id, [3, 5])  # Player 2 miss
    assert attack8.turn == player1.user_id
    assert board_service.get_board(test_db, board1.board_id).board_state[3][5] == "M"

    attack9 = game_service.attack(test_db, game.game_id, player1.user_id, [7, 9])  # Player 1 hits
    # no turn switch since player 1 won
    assert attack9.turn == player1.user_id
    assert board_service.get_board(test_db, board2.board_id).board_state[7][9] == "H"

    # 7. Verify board states
    board1_updated = board_service.get_board(test_db, board1.board_id)
    board2_updated = board_service.get_board(test_db, board2.board_id)

    print(f"board1_updated: {board1_updated.board_state}")
    print(f"board2_updated: {board2_updated.board_state}")

    assert board2_updated.board_state[5][5] == "H"
    assert board1_updated.board_state[0][0] == "H"
    assert board2_updated.board_state[5][6] == "H"
    assert board1_updated.board_state[2][2] == "H"

    assert board2_updated.board_state[7][7] == "H"
    assert board1_updated.board_state[0][5] == "M"
    assert board2_updated.board_state[7][8] == "H"
    assert board1_updated.board_state[3][5] == "M"
    assert board2_updated.board_state[7][9] == "H"

    # verfiy game status changes to finished and winner is player1
    final_game = game_service.get_game(test_db, game.game_id)
    assert final_game.game_status == "finished"
    assert final_game.winner_id == player1.user_id