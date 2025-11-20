import logging
import os
import random
from typing import Optional, Tuple

from app.crud.board_service import get_board_by_game_and_player, update_board
from app.crud.game_service import attack, get_game, join_game
from app.crud.ship_service import create_ship
from app.crud.user_service import create_user, get_user_by_username
from app.exceptions import NotFoundError, PermissionError, ValidationError
from app.models.game import Game
from app.schemas.game import Game as GameSchema
from app.schemas.ship import ShipCreate
from app.schemas.users import UserCreate
from dotenv import load_dotenv
from sqlalchemy.orm import Session

load_dotenv()
logger = logging.getLogger(__name__)


# Smarter Bot class


class BotAI:
    bot_states = {}
    SHIP_SIZES = [5, 4, 3, 3, 2]

    def __init__(self, board_state: list, game_id: int = None):
        self.board_state = board_state
        self.board_size = len(board_state)
        self.game_id = game_id

        # load existing state or create new
        if game_id and game_id in BotAI.bot_states:
            state = BotAI.bot_states[game_id]
            self.hits = state.get("hits", [])
            self.direction = state.get("direction", None)
            self.attack_front = state.get("attack_front", None)
            self.attack_back = state.get("attack_back", None)
            self.remaining_ship_sizes = state.get("remaining_ship_sizes", self.SHIP_SIZES.copy())
        else:
            self.hits = []
            self.direction = None
            self.attack_front = None
            self.attack_back = None
            self.remaining_ship_sizes = self.SHIP_SIZES.copy()

    def save_state(self):
        if self.game_id:
            BotAI.bot_states[self.game_id] = {
                "hits": self.hits,
                "direction": self.direction,
                "attack_front": self.attack_front,
                "attack_back": self.attack_back,
                "remaining_ship_sizes": self.remaining_ship_sizes,
            }

    def get_next_move(self) -> Tuple[int, int]:
        # Target mode, on hit, continue sinking it
        if self.hits:
            move = self._target_mode()
            if move:
                return move

        # Hunt mode: search for new ships with checkerboard pattern
        return self._hunt_mode()

    def _hunt_mode(self) -> Tuple[int, int]:
        # hunt randomly
        attempts = 0
        max_attempts = 100

        while attempts < max_attempts:
            row = random.randint(0, self.board_size - 1)
            col = random.randint(0, self.board_size - 1)
            cell = self.board_state[row][col]

            if cell in ["O", "S"]:
                return (row, col)

            attempts += 1

        for row in range(self.board_size):
            for col in range(self.board_size):
                cell = self.board_state[row][col]
                if cell in ["O", "S"]:
                    return (row, col)

        return (random.randint(0, self.board_size - 1), random.randint(0, self.board_size - 1))

    def _target_mode(self) -> Optional[Tuple[int, int]]:
        if not self.hits:
            return None

        if self.direction:
            return self._attack_in_direction()

        if len(self.hits) == 1:
            return self._probe_directions()

        if len(self.hits) >= 2:
            self._find_direction()
            if self.direction:
                return self._attack_in_direction()

        return None

    def _probe_directions(self) -> Optional[Tuple[int, int]]:
        hit_row, hit_col = self.hits[0]

        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            next_row = hit_row + dr
            next_col = hit_col + dc

            if 0 <= next_row < self.board_size and 0 <= next_col < self.board_size:
                if self.board_state[next_row][next_col] in ["O", "S"]:
                    return (next_row, next_col)

        return None

    def _find_direction(self):
        if len(self.hits) < 2:
            return

        rows = [h[0] for h in self.hits]
        cols = [h[1] for h in self.hits]

        # All same row = horizontal
        if len(set(rows)) == 1:
            self.direction = "horizontal"
            self._setup_direction_attacks()
        # All same column = vertical
        elif len(set(cols)) == 1:
            self.direction = "vertical"
            self._setup_direction_attacks()

    def _setup_direction_attacks(self):
        if not self.hits or not self.direction:
            return

        if self.direction == "horizontal":
            self.hits.sort(key=lambda h: h[1])  # Sort by column
            row = self.hits[0][0]

            back_col = self.hits[0][1] - 1
            self.attack_back = (row, back_col) if back_col >= 0 else None

            front_col = self.hits[-1][1] + 1
            self.attack_front = (row, front_col) if front_col < self.board_size else None

        else:
            self.hits.sort(key=lambda h: h[0])  # Sort by row
            col = self.hits[0][1]

            back_row = self.hits[0][0] - 1
            self.attack_back = (back_row, col) if back_row >= 0 else None

            front_row = self.hits[-1][0] + 1
            self.attack_front = (front_row, col) if front_row < self.board_size else None

    def _attack_in_direction(self) -> Optional[Tuple[int, int]]:
        self._setup_direction_attacks()

        if self.attack_front:
            front_row, front_col = self.attack_front
            cell = self.board_state[front_row][front_col]
            if cell in ["O", "S"]:  # Not yet attacked
                return (front_row, front_col)

        if self.attack_back:
            back_row, back_col = self.attack_back
            cell = self.board_state[back_row][back_col]
            if cell in ["O", "S"]:  # Not yet attacked
                return (back_row, back_col)

        # Check if current ship size matches a known ship size
        if self._is_ship_sunk():
            # Mark this ship as sunk
            if len(self.hits) in self.remaining_ship_sizes:
                self.remaining_ship_sizes.remove(len(self.hits))
            self.hits = []
            self.direction = None
            self.attack_front = None
            self.attack_back = None
            return None

        # Ship not yet sunk, keep trying (not to be reached)
        return None

    def _is_ship_sunk(self) -> bool:
        if not self.hits:
            return False

        current_size = len(self.hits)

        if current_size in self.remaining_ship_sizes:
            return True

        if current_size > max(self.remaining_ship_sizes) if self.remaining_ship_sizes else False:
            return True

        return False

    def analyze_board_for_hits(self):
        new_hits = []
        for row in range(self.board_size):
            for col in range(self.board_size):
                if self.board_state[row][col] == "H":
                    new_hits.append((row, col))

        # if no hits on board present, reset to hunt mode (all ships sunk)
        if not new_hits:
            self.hits = []
            self.direction = None
            self.attack_front = None
            self.attack_back = None
            return

        if not self.hits:
            # filter out hits that are far from each other
            if len(new_hits) == 1:
                self.hits = new_hits
            else:
                self.hits = self._find_ship_cluster(new_hits)
            return

        # still same ship?
        old_set = set(self.hits)
        new_set = set(new_hits)

        if old_set.issubset(new_set):
            only_new_hits = list(new_set - old_set)

            if not only_new_hits:
                return

            if self._are_hits_connected(self.hits + only_new_hits):
                self.hits = new_hits
                return

        # ship sunk or new ship found
        if len(self.hits) > 0:
            current_ship_size = len(self.hits)
            # remove this ship size from remaining ships
            if current_ship_size in self.remaining_ship_sizes:
                self.remaining_ship_sizes.remove(current_ship_size)

        new_ship_hits = self._find_ship_cluster(new_hits)

        # reset targeting state for this new ship
        self.hits = new_ship_hits
        self.direction = None
        self.attack_front = None
        self.attack_back = None

        if len(self.hits) >= 2:
            self._find_direction()

    def _are_hits_connected(self, hits: list) -> bool:
        if len(hits) <= 1:
            return True  # Single hit or empty is valid

        hits_sorted = sorted(set(hits))  # Remove duplicates and sort

        rows = [h[0] for h in hits_sorted]
        cols = [h[1] for h in hits_sorted]

        # horizontal
        if len(set(rows)) == 1:
            sorted_cols = sorted(cols)
            for i in range(len(sorted_cols) - 1):
                if sorted_cols[i + 1] - sorted_cols[i] != 1:
                    return False
            return True

        # vertical
        if len(set(cols)) == 1:
            sorted_rows = sorted(rows)
            for i in range(len(sorted_rows) - 1):
                if sorted_rows[i + 1] - sorted_rows[i] != 1:
                    return False
            return True
        # multiple ships
        return False

    # tldr, cluster
    def _find_ship_cluster(self, all_hits: list) -> list:
        if not all_hits:
            return []

        if len(all_hits) == 1:
            return all_hits

        sorted_hits = sorted(all_hits)

        if self._are_hits_connected(sorted_hits):
            return sorted_hits
        clusters = []
        visited_global = set()

        for start_hit in sorted_hits:
            if start_hit in visited_global:
                continue

            visited = set()
            cluster = []
            queue = [start_hit]
            visited.add(start_hit)
            visited_global.add(start_hit)

            while queue:
                current = queue.pop(0)
                cluster.append(current)

                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    neighbor = (current[0] + dr, current[1] + dc)
                    if neighbor in all_hits and neighbor not in visited:
                        visited.add(neighbor)
                        visited_global.add(neighbor)
                        queue.append(neighbor)

            clusters.append(sorted(cluster))
        return min(clusters, key=len) if clusters else []


# Bot CRUD
# bot attack with smart bot ai
def bot_attack(db: Session, game_id: int, bot_id: int) -> Optional[GameSchema]:
    db_game = db.query(Game).filter(Game.game_id == game_id).first()
    if not db_game:
        raise NotFoundError("Game")
    if db_game.turn != bot_id:
        raise ValidationError(f"Not bot's turn: {db_game.turn}, Bot ID: {bot_id}")
    if db_game.game_status != "playing":
        raise ValidationError("Game is not in playing state")

    # dynamically get opponent board
    opponent_id = db_game.player1_id if bot_id == db_game.player2_id else db_game.player2_id
    opponent_board = get_board_by_game_and_player(db, game_id, opponent_id)
    if not opponent_board:
        raise NotFoundError("Opponent board")

    # Create bot instance with game_id to load persistent state!
    bot = BotAI(opponent_board.board_state, game_id=game_id)
    bot.analyze_board_for_hits()  # find all current hits for targeting botai mode
    row, col = bot.get_next_move()

    # Save bot state, for following turns
    bot.save_state()

    return attack(db, game_id, bot_id, [row, col])


def call_bot_to_join(db: Session, game_id: int, user_id: int) -> dict:
    # Verify game exists
    game = get_game(db, game_id)
    if not game:
        raise NotFoundError("Game")

    if game.player1_id != user_id and (game.player2_id is None or game.player2_id != user_id):
        raise PermissionError("You are not in this game")

    if game.player2_id is not None and game.player2_id != user_id:
        raise ValidationError("Game already has two players")

    bot_username = "Bot"
    bot_user = get_user_by_username(db, bot_username)

    if not bot_user:
        # only once, if bot user does not exist yet
        # environment variable for bot password
        bot_password = os.getenv("BOT_PASSWORD")
        if not bot_password:
            logger.error("BOT_PASSWORD environment variable not set")
            raise ValidationError("Server configuration error")

        bot_user = create_user(db, UserCreate(username=bot_username, email="bot@battleship.de", password=bot_password))

    # Join bot to game
    game = join_game(db, game_id, bot_user.user_id)
    if not game:
        raise ValidationError("Failed to join bot to game")

    # Get bot board
    bot_board = get_board_by_game_and_player(db, game_id, bot_user.user_id)
    if not bot_board:
        raise NotFoundError("Bot board")

    # Place bot ships (randomly)
    ships = [
        {"type": "Carrier", "size": 5},
        {"type": "Battleship", "size": 4},
        {"type": "Cruiser", "size": 3},
        {"type": "Submarine", "size": 3},
        {"type": "Destroyer", "size": 2},
    ]

    board_size = 10
    for ship in ships:
        placed = False
        max_attempts = 100
        attempts = 0

        while not placed and attempts < max_attempts:
            direction = random.choice(["horizontal", "vertical"])
            start_row = random.randint(0, board_size - 1)
            start_col = random.randint(0, board_size - 1)

            coordinates = [
                (start_row, start_col + i) if direction == "horizontal" else (start_row + i, start_col)
                for i in range(ship["size"])
            ]

            if all(
                0 <= row < board_size and 0 <= col < board_size and bot_board.board_state[row][col] == "O"
                for row, col in coordinates
            ):
                # Place ship on board
                for row, col in coordinates:
                    bot_board.board_state[row][col] = "S"

                # Create ship in database
                create_ship(
                    db, ShipCreate(board_id=bot_board.board_id, ship_type=ship["type"], ship_coordinates=coordinates)
                )
                placed = True

            attempts += 1

        # check all ships placed
        if not placed:
            logger.error(f"Failed to place bot ship {ship['type']} after {max_attempts} attempts")
            raise ValidationError("Failed to place bot ships")

    update_board(db, bot_board.board_id, bot_board.board_state, board_status="locked")

    logger.info(f"Bot successfully joined game {game_id}")

    # Return the updated game with bot joined
    return get_game(db, game_id)


# call bot to attack with authorization and error handling
def perform_bot_attack(db: Session, game_id: int, user_id: int) -> Optional[GameSchema]:
    game = get_game(db, game_id)
    if not game:
        raise NotFoundError("Game")

    if game.player1_id != user_id and game.player2_id != user_id:
        raise PermissionError("You are not in this game")

    bot_user = get_user_by_username(db, "Bot")
    if not bot_user:
        raise NotFoundError("Bot user")

    updated_game = bot_attack(db, game_id, bot_user.user_id)
    if not updated_game:
        raise ValidationError("Invalid attack or game finished")

    logger.info(f"Bot attack completed in game {game_id}")

    return updated_game
