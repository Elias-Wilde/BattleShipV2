import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getGameDetails,
  getBoardDetails,
  placeShip,
  lockBoard,
  attackOpponent,
  callBot,
  callBotAttack,
  startGame,
  getUserById,
  getUser,
  surrenderGame,
} from '../utils/api';
import { getAuthToken, clearActiveGameId } from '../utils/auth';
import { getErrorMessage, logError } from '../utils/errorHandler';
import Board from '../components/Board';
import GameOverPopup from '../components/GameOverPopup';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import '../styles/GamePage.css';


function GamePage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [playerBoard, setPlayerBoard] = useState(null);
  const [opponentBoard, setOpponentBoard] = useState(null);
  const [ships, setShips] = useState([
    { type: 'Carrier', size: 5, placed: false },
    { type: 'Battleship', size: 4, placed: false },
    { type: 'Cruiser', size: 3, placed: false },
    { type: 'Submarine', size: 3, placed: false },
    { type: 'Destroyer', size: 2, placed: false },
  ]);
  const [selectedShip, setSelectedShip] = useState(null);
  const [placementDirection, setPlacementDirection] = useState('horizontal');
  const [previewCoordinates, setPreviewCoordinates] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [turn, setTurn] = useState(null);
  const [error, setError] = useState('');
  const [waitingMessage, setWaitingMessage] = useState('');
  const [attackLog, setAttackLog] = useState([]);
  const [shipsHealth, setShipsHealth] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isPlayerWinner, setIsPlayerWinner] = useState(false);
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const isBotAttacking = useRef(false);

  // ensure gameid is a string of numbers only
  const validateGameId = (id) => {
    return typeof id === 'string' && /^\d+$/.test(id);
  };

  const handleCloseGame = () => {
    clearActiveGameId();
    navigate('/');
  };

  const handleSurrender = async () => {
    try {
      const token = getAuthToken();
      const user = await getUser(token);
      const playerId = user.user_id;

      if (!playerId || typeof playerId !== 'number') {
        setError('Invalid user session. Please log in again.');
        return;
      }

      const result = await surrenderGame(gameId, playerId);
      clearActiveGameId();

      if (game.game_status === 'waiting') {
        toast.success('Game cancelled successfully!');
      } else {
        toast.success('You surrendered the game. Better luck next time!');
      }

      navigate('/');
    } catch (err) {
      const errorMsg = getErrorMessage(err) || 'Failed to cancel/surrender game.';
      logError(err, 'GamePage.handleSurrender()');
      toast.error(errorMsg);
    } finally {
      setShowSurrenderModal(false);
    }
  };

  // fetch game details on mount and gameId changes
  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        // Security: Validate game ID
        if (!validateGameId(gameId)) {
          setError('Invalid game ID.');
          return;
        }

        const gameData = await getGameDetails(gameId);
        setGame(gameData);

        if (gameData.game_status === 'waiting') {
          setWaitingMessage('Waiting for second player to join.');
          setIsLoading(false);
          return;
        }

        const token = localStorage.getItem('token');
        const currentUser = await getUser(token);
        const currentUserId = currentUser.user_id;

        if (gameData.game_status === 'finished') {
          setIsGameOver(true);
          setWinner(gameData.winner_id);
          setIsPlayerWinner(gameData.winner_id === currentUserId);
        }

        setTurn(gameData.turn);

        const isPlayer1 = currentUserId === gameData.player1_id;
        const playerBoardData = await getBoardDetails(
          gameId,
          isPlayer1 ? gameData.player1_id : gameData.player2_id
        );
        const opponentBoardData = await getBoardDetails(
          gameId,
          isPlayer1 ? gameData.player2_id : gameData.player1_id
        );

        setPlayerBoard(playerBoardData);
        setOpponentBoard(opponentBoardData);

        const shipsData = playerBoardData.ships.map((ship) => ({
          type: ship.type,
          size: ship.ship_coordinates.length,
          hits: ship.ship_hits.length,
        }));
        setShipsHealth(shipsData);

        const player1 = await getUserById(gameData.player1_id);
        const player2 = gameData.player2_id
          ? await getUserById(gameData.player2_id)
          : { username: 'Waiting for Player...' };

        setPlayer1Name(player1.username);
        setPlayer2Name(player2.username);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to fetch game details. Please try again.');
        setIsLoading(false);
      }
    };

    if (game?.game_status === 'waiting') {
      const interval = setInterval(fetchGameDetails, 3000);
      return () => clearInterval(interval);
    }

    fetchGameDetails();
  }, [gameId, game?.game_status]);


  const validatePlacement = (coordinates) => {
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      setError('Invalid placement coordinates.');
      return false;
    }

    const isWithinBounds = coordinates.every(([row, col]) => {
      if (typeof row !== 'number' || typeof col !== 'number') {
        return false;
      }
      return row >= 0 && row < 10 && col >= 0 && col < 10;
    });

    if (!isWithinBounds) {
      setError('Ship placement is out of bounds. Please try again.');
      return false;
    }

    const isOverlapping = coordinates.some(([row, col]) => {
      const cell = playerBoard.board_state[row][col];
      return cell === 'S';
    });

    if (isOverlapping) {
      setError('Ship placement overlaps with existing ships. Please try again.');
      return false;
    }

    return true;
  };

  // before sending them
  const validateAttackCoordinates = (coordinates) => {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      setError('Invalid attack coordinates.');
      return false;
    }

    const [row, col] = coordinates;

    if (typeof row !== 'number' || typeof col !== 'number') {
      setError('Invalid coordinate format.');
      return false;
    }

    if (row < 0 || row > 9 || col < 0 || col > 9) {
      setError('Attack coordinates are out of bounds.');
      return false;
    }

    const cellValue = opponentBoard.board_state[row][col];
    if (cellValue === 'H' || cellValue === 'M') {
      setError('You have already attacked this cell. Choose a different target.');
      return false;
    }

    return true;
  };

  const handleSelectShip = (shipType) => {
    const ship = ships.find((s) => s.type === shipType && !s.placed);
    if (ship) {
      setSelectedShip(ship);
      setPreviewCoordinates([]);
      setError('');
    }
  };

  const handlePreviewPlacement = (coordinates) => {
    if (!selectedShip) return;

    const shipCoordinates = Array.from({ length: selectedShip.size }, (_, i) =>
      placementDirection === 'horizontal'
        ? [coordinates[0], coordinates[1] + i]
        : [coordinates[0] + i, coordinates[1]]
    );
    setPreviewCoordinates(shipCoordinates);
  };


  const handlePlaceShip = async () => {
    if (!selectedShip || previewCoordinates.length === 0) {
      setError('Please select a ship and preview its placement.');
      return;
    }

    if (!validatePlacement(previewCoordinates)) {
      return;
    }

    try {
      await placeShip(playerBoard.board_id, selectedShip.type, previewCoordinates);

      setPlayerBoard((prevBoard) => ({
        ...prevBoard,
        board_state: prevBoard.board_state.map((row, rowIndex) =>
          row.map((cell, colIndex) =>
            previewCoordinates.some(([r, c]) => r === rowIndex && c === colIndex)
              ? 'S'
              : cell
          )
        ),
      }));

      setShips((prevShips) =>
        prevShips.map((ship) =>
          ship.type === selectedShip.type ? { ...ship, placed: true } : ship
        )
      );

      setSelectedShip(null);
      setPreviewCoordinates([]);
      setError('');
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || 'Failed to place ship. Please try again.';
      setError(errorMessage);
    }
  };


  const handleLockBoard = async () => {
    try {
      await lockBoard(playerBoard.board_id, playerBoard.board_state, 'locked');
      setIsLocked(true);
      setError('');

      const updateGame = await startGame(gameId);
      setGame(updateGame);
      setTurn(updateGame.turn);

      if (updateGame.game_status === 'playing' && updateGame.turn === playerBoard.player_id) {
        toast.info("Game started. It's your turn!");
      } else if (updateGame.game_status === 'waiting_for_opponent') {
        toast.info('Board locked. Waiting for opponent to lock their board.');
      }

      const updatedPlayerBoard = await getBoardDetails(gameId, playerBoard.player_id);
      const updatedOpponentBoard = await getBoardDetails(gameId, opponentBoard.player_id);

      setPlayerBoard(updatedPlayerBoard);
      setOpponentBoard(updatedOpponentBoard);
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || 'Failed to lock board. Please try again.';
      setError(errorMessage);
    }
  };


  const handleAttack = async (coordinates) => {
    try {
      if (turn !== playerBoard.player_id) {
        setError("It's not your turn to attack.");
        return;
      }

      if (!validateAttackCoordinates(coordinates)) {
        return;
      }

      const updatedGame = await attackOpponent(gameId, playerBoard.player_id, coordinates);
      setGame(updatedGame);
      setTurn(updatedGame.turn);

      const updatedOpponentBoard = await getBoardDetails(gameId, opponentBoard.player_id);
      setOpponentBoard(updatedOpponentBoard);

      const cellValue = updatedOpponentBoard.board_state[coordinates[0]][coordinates[1]];
      setAttackLog((prevLog) => [
        ...prevLog,
        `You attacked (${coordinates[0] + 1}, ${coordinates[1] + 1}): ${
          cellValue === 'H' ? 'Hit!' : 'Miss!'
        }`,
      ]);

      if (updatedGame.game_status === 'finished') {
        setIsGameOver(true);
        setWinner(updatedGame.winner_id);
        setIsPlayerWinner(updatedGame.winner_id === playerBoard.player_id);
        toast.info(
          `Game over! ${updatedGame.winner_id === playerBoard.player_id ? 'You win!' : 'You lose!'}`
        );
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || 'Failed to attack opponent. Please try again.';
      setError(errorMessage);
    }
  };


  const handleCallBot = async () => {
    try {
      const response = await callBot(gameId);
      toast.success('Bot called successfully! Game starting...');
      setWaitingMessage('');

      // update game state
      setGame(response);
      // refresh boards
      const playerBoardData = await getBoardDetails(gameId, response.player1_id);
      const opponentBoardData = await getBoardDetails(gameId, response.player2_id);

      setPlayerBoard(playerBoardData);
      setOpponentBoard(opponentBoardData);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to call bot. Please try again.';
      logError(err, 'GamePage.handleCallBot()');
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  // bot attack
  useEffect(() => {
    const botAttack = async () => {
      if (isBotAttacking.current) return;
      if (
        !opponentBoard ||
        !game ||
        turn !== opponentBoard.player_id ||
        game.game_status !== 'playing'
      ) {
        return;
      }

      isBotAttacking.current = true;

      try {
        const previousPlayerBoard = { ...playerBoard };
        const updatedGame = await callBotAttack(gameId);

        setGame(updatedGame);
        setTurn(updatedGame.turn);

        const updatedPlayerBoard = await getBoardDetails(gameId, playerBoard.player_id);
        const attackCoordinates = findAttackCoordinates(
          previousPlayerBoard.board_state,
          updatedPlayerBoard.board_state
        );

        if (attackCoordinates) {
          const cellValue = updatedPlayerBoard.board_state[attackCoordinates[0]][attackCoordinates[1]];
          setPlayerBoard(updatedPlayerBoard);
          setAttackLog((prevLog) => [
            ...prevLog,
            `Bot attacked (${attackCoordinates[0] + 1}, ${attackCoordinates[1] + 1}): ${
              cellValue === 'H' ? 'Hit!' : 'Miss!'
            }`,
          ]);
        }

        if (updatedGame.game_status === 'finished') {
          setIsGameOver(true);
          setWinner(updatedGame.winner_id);
          setIsPlayerWinner(updatedGame.winner_id === playerBoard.player_id);
          toast.info(
            `Game over! ${updatedGame.winner_id === playerBoard.player_id ? 'You win!' : 'You lose!'}`
          );
        }
      } catch (err) {
        setError('Bot failed to attack.');
      } finally {
        isBotAttacking.current = false;
      }
    };

    botAttack();
  }, [opponentBoard, game, turn, gameId, playerBoard]);


  const findAttackCoordinates = (previousBoard, updatedState) => {
    for (let row = 0; row < previousBoard.length; row++) {
      for (let col = 0; col < previousBoard[row].length; col++) {
        if (previousBoard[row][col] !== updatedState[row][col]) {
          return [row, col];
        }
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className='loading'>
        <ClipLoader color='#007bff' size={50} aria-label='Loading' />
        <p>Loading game...</p>
      </div>
    );
  }

  return (
    <div className='game-page'>
      <h1>Battleship Game</h1>
      {error && <p className='error'>{error}</p>}

      {waitingMessage && (
        <div className='waiting-message'>
          <p>{waitingMessage}</p>
          <button onClick={handleCallBot}>Call Bot</button>
        </div>
      )}

      {!game || !playerBoard || !opponentBoard ? (
        <div className='loading'>
          <ClipLoader color='#007bff' size={50} aria-label='Loading' />
          <p>Loading...</p>
        </div>
      ) : (
        <>
          <div className='game-status' aria-live='polite'>
            <p>
              <strong>Player 1:</strong> {player1Name}
            </p>
            <p>
              <strong>Player 2:</strong> {player2Name}
            </p>
            <p>
              Status:{' '}
              {game.game_status === 'waiting'
                ? 'Waiting for opponent to join...'
                : game.game_status === 'ready'
                ? 'Both players are ready. Game will start soon!'
                : game.game_status === 'playing'
                ? turn === playerBoard.player_id
                  ? "Your turn to attack!"
                  : "Opponent's turn, waiting..."
                : game.game_status === 'waiting_for_opponent'
                ? isLocked
                  ? 'Board locked. Waiting for opponent to lock their board.'
                  : 'Opponent has locked their board. Place your ships and lock your board to begin.'
                : game.game_status === 'finished'
                ? 'Game over!'
                : 'Placing ships...'}
            </p>
          </div>

          <div className='ship-selection'>
            <h2>Available Ships</h2>
            <ul>
              {ships.map((ship) => (
                <li key={ship.type}>
                  <button
                    onClick={() => handleSelectShip(ship.type)}
                    disabled={ship.placed || isLocked}
                  >
                    {ship.type} ({ship.size})
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className='placement-direction'>
            <h3>Placement Direction</h3>
            <button
              onClick={() => setPlacementDirection('horizontal')}
              disabled={placementDirection === 'horizontal' || isLocked}
            >
              Horizontal
            </button>
            <button
              onClick={() => setPlacementDirection('vertical')}
              disabled={placementDirection === 'vertical' || isLocked}
            >
              Vertical
            </button>
          </div>

          <div className='game-layout'>
            <div className='attack-log'>
              <h2>Attack Log</h2>
              <ul>
                {attackLog.map((log, index) => (
                  <li key={index}>{log}</li>
                ))}
              </ul>
            </div>

            <div className='boards'>
              <div>
                <h2>Your Board</h2>
                <Board
                  boardState={playerBoard.board_state}
                  isPlayerBoard={true}
                  selectedShip={selectedShip}
                  previewCoordinates={previewCoordinates}
                  onPreviewPlacement={handlePreviewPlacement}
                  onPlaceShip={handlePlaceShip}
                />
                {!isLocked && (
                  <div className='ship-actions'>
                    <button
                      onClick={handleLockBoard}
                      disabled={ships.some((ship) => !ship.placed)}
                    >
                      Lock Board
                    </button>
                  </div>
                )}
              </div>
              <div>
                <h2>Opponent's Board</h2>
                <Board
                  boardState={opponentBoard.board_state}
                  isPlayerBoard={false}
                  onAttack={handleAttack}
                  isTurn={turn === playerBoard.player_id}
                />
              </div>
            </div>

            <div className='ships-health'>
              <h2>Your Ships</h2>
              <ul>
                {shipsHealth.map((ship) => (
                  <li key={ship.type}>
                    {ship.type}: {ship.hits}/{ship.size} hits
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className='game-actions'>
            <button onClick={() => setShowSurrenderModal(true)} className='btn-danger'>
              Surrender/Cancel Game
            </button>
          </div>
        </>
      )}

      {isGameOver && (
        <GameOverPopup winner={winner} isPlayerWinner={isPlayerWinner} onClose={handleCloseGame} />
      )}

      {showSurrenderModal && (
        <ConfirmModal
          title='Confirm Surrender'
          message='Are you sure you want to surrender this game?'
          onConfirm={handleSurrender}
          onCancel={() => setShowSurrenderModal(false)}
        />
      )}
    </div>
  );
}

export default GamePage;
