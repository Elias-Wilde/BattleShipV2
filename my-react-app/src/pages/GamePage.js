import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGameDetails, getBoardDetails, placeShip, lockBoard, attackOpponent, callBot, callBotAttack, startGame, getUserById } from '../utils.js/api';
import Board from '../components/Board';
import GameOverPopup from '../components/GameOverPopup';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import '../styles/GamePage.css';

function GamePage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [playerBoard , setPlayerBoard] = useState(null);
  const [opponentBoard , setOpponentBoard] = useState(null);
  const [ships, setShips] = useState([
    { type: 'Carrier', size: 5, placed: false },
    { type: 'Battleship', size: 4, placed: false },
    { type: 'Cruiser', size: 3, placed: false },
    { type: 'Submarine', size: 3, placed: false },
    { type: 'Destroyer', size: 2, placed: false },
  ]);
  const [selectedShip, setSelectedShip] = useState(null);
  const [placementDirection, setPlacementDirection] = useState('horizontal'); // or 'vertical'
  const [previewCoordinates, setPreviewCoordinates] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [turn, setTurn] = useState(null);
  const [error, setError] = useState('');
  const [waitingMessage, setWaitingMessage] = useState('');

  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isPlayerWinner, setIsPlayerWinner] = useState(false);

  const navigate = useNavigate();

  const isBotAttacking = useRef(false);

  const remainingShips = opponentBoard?.ships?.filter((ship) => !ship.placed).length || 0;

  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');

  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        const gameData = await getGameDetails(gameId);
        setGame(gameData);

        if (gameData.game_status === 'waiting') {
          // cant fetch the game before second playern joined. No boards created yet
          setWaitingMessage('waiting for second player to join.')
          return;
        }

        if (gameData.game_status === 'finished') {
          setIsGameOver(true);
          setWinner(gameData.winner_id);
          setIsPlayerWinner(gameData.winner_id === gameData.player1_id);
        }

        console.log("turn:", turn)
        setTurn(gameData.turn);

        const playerBoardData = await getBoardDetails(gameId, gameData.player1_id);
        const opponentBoardData = await getBoardDetails(gameId, gameData.player2_id);
        setPlayerBoard(playerBoardData);
        setOpponentBoard(opponentBoardData);

        const player1 = await getUserById(gameData.player1_id);
        const player2 = gameData.player2_id ? await getUserById(gameData.player2_id) : { username: 'Waiting for Player...' };
        setPlayer1Name(player1.username);
        setPlayer2Name(player2.username);
      } catch (err) {
        setError('Failed to fetch game details. Please try again.');
      }
    };

    fetchGameDetails();
  }, [gameId]);


  const handleCloseGame = () => {
    localStorage.removeItem('activeGameId'); // clear the active gameId
    navigate('/');
  };

  useEffect(() => {
    if (game?.game_status === 'ready') {
      setError('');
      toast.success('Game is ready! You can start attacking.');
    }
  }, [game]);


  const handleCallBot = async () => {
    try {
      await callBot(gameId);
      toast.info('Bot called successfully. Refreshing game');
      setWaitingMessage('');
      // fetch update game details
      const gameData = await getGameDetails(gameId);
      setGame(gameData);
      const playerBoardData = await getBoardDetails(gameId, gameData.player1_id);
      const opponentBoardData = await getBoardDetails(gameId, gameData.player2_id);
      setPlayerBoard(playerBoardData);
      setOpponentBoard(opponentBoardData);

    } catch (err) {
      setError('Failed to call bot. Please try again.');
    }
  };

  const handleSelectShip = (shipType) => {
    const ship = ships.find((s) => s.type === shipType && !s.placed);
    console.log(ship);
    if (ship) {
      setSelectedShip(ship);
      setPreviewCoordinates([]); // clear previou
      setError(''); // clear error (if any)
    }
  };

  const validatePlacement = (coordinates) => {
    const isWithinBounds = coordinates.every(([row, col]) => row >= 0 && row < 10 && col < 10);
    if (!isWithinBounds) {
      setError('Ship placement is out of bounds. Please try again.');
      return false;
    }

    const isOverlapping = coordinates.some(([row, col]) => playerBoard.board_state[row][col] === 'S');
    if ((isOverlapping)) {
      setError('Ship placement overlaps with existing ships. Please try again.');
      return false;
    }

    return true;
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
      setError('Please select a ship to preview its placement.');
      return;
    }

    if (!validatePlacement(previewCoordinates)) {
      return;
    }

    try {
      console.log(playerBoard.board_id)
      await placeShip(playerBoard.board_id, selectedShip.type, previewCoordinates);

      setShips((prevShips) =>
        prevShips.map((ship) =>
          ship.type === selectedShip.type ? { ...ship, placed: true } : ship
        )
      );
      setPlayerBoard((prevBoard) => ({
        ...prevBoard,
        board_state: prevBoard.board_state.map((row, rowIndex) =>
        row.map((cell, colIndex) =>
          previewCoordinates.some(
            ([r, c]) => r === rowIndex && c === colIndex
          ) ? 'S' : cell
          )
        ),
      }));
      setSelectedShip(null);
      setPreviewCoordinates([]);
      setError(''); // clear previous errors
    } catch (err) {
      setError(err.response?.data?.detail ||'Failed to place ship. Please try again.');
    };
};

  const handleLockBoard = async () => {
    try {
      console.log("player board state:", playerBoard.board_state)
      await lockBoard(playerBoard.board_id, playerBoard.board_state, "locked");
      setIsLocked(true);
      setError('');

      const updateGame = await startGame(gameId);
      setGame(updateGame);
      setTurn(updateGame.turn);

      if (updateGame.game_status === 'playing' && updateGame.turn === playerBoard.player_id) {
        toast.info("Game started, its your turn")
      }

      // fetch updated boards
      const updatedPlayerBoard = await getBoardDetails(gameId, playerBoard.player_id);
      const updatedOpponentBoard = await getBoardDetails(gameId, opponentBoard.player_id);

      setPlayerBoard(updatedPlayerBoard);
      setOpponentBoard(updatedOpponentBoard);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'failed to lock board. Please try again';
      setError(errorMessage);
    }
  };

  // player attacks
  const handleAttack = async (coordinates) => {
    try {
      if (turn !== playerBoard.player_id) {
        setError("It's not your turn to attack.");
        return;
      }

      const updatedGame = await attackOpponent(gameId, playerBoard.player_id, coordinates);
      // update game and turn state
      setGame(updatedGame);
      setTurn(updatedGame.turn);

      if (updatedGame.game_status === 'finished') {
        setIsGameOver(true);
        setWinner(updatedGame.winner_id);
        setIsPlayerWinner(updatedGame.winner_id === playerBoard.player_id);
      }

      // fetch updated boards
      const updatedOpponentBoard = await getBoardDetails(gameId, opponentBoard.player_id);
      // update opponent board state
      setOpponentBoard(updatedOpponentBoard);

      if (updatedGame.game_status === 'finished') {
        //  TODO: real animation for game over
        toast.info(`Game over! ${updatedGame.winner_id === playerBoard.player_id ? "You win!" : "you Lose!"}`);
        return;
      }

    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to attack opponent. Please try again.';
      setError(errorMessage);
    }
  };

  // bot attacks ( trigger automatically)
  useEffect(() => {
    const botAttack = async () => {
      // flag to prevent double attacks
      if (isBotAttacking.current) return;
      if (!opponentBoard || !game || turn !== opponentBoard.player_id || game.game_status !== 'playing') {
        return
      }
      isBotAttacking.current = true;
      try {
        const updatedGame = await callBotAttack(gameId);
        // update game and turn state
        setGame(updatedGame);
        setTurn(updatedGame.turn);

        // Fetch updated boards
        const updatedPlayerBoard = await getBoardDetails(gameId, playerBoard.player_id);
        // update player board state
        setPlayerBoard(updatedPlayerBoard);

        if (updatedGame.game_status === 'finished') {
          //  TODO: real animation for game over
          toast.info(`Game over! ${updatedGame.winner_id === playerBoard.player_id ? "You win!" : "you Lose!"}`);
        }
      } catch (err) {
        setError("Bot failed to attack.")
      } finally {
        isBotAttacking.current = false;
      }
    };

    botAttack();
  }, [opponentBoard, game, turn, gameId, playerBoard]);

  // useEffect(() => {
  //   console.log("Game state updated:", game);
  //   console.log("Player board updated:", playerBoard);
  //   console.log("Opponent board updated:", opponentBoard);
  // }, [game, playerBoard, opponentBoard]);

  return (
    <div className="game-page">
      <h1>Battleship Game</h1>
      {error && <p className="error">{error}</p>}

      {waitingMessage && (
        <div className="waiting-message">
          <p>{waitingMessage}</p>
          <button onClick={handleCallBot}>Call Bot</button>
        </div>
      )}

      {!game || !playerBoard || !opponentBoard ? (
        <div className="loading">
          <ClipLoader color="#007bff" size={50} arai-label="Loading" />
          <p>Loading...</p>
        </div>
      ) : (
        <>
        <div className="game-status" aria-live="polite">
          <p>
            <strong>Player 1:</strong> {player1Name}
          </p>
          <p>
            <strong>Player 2:</strong> {player2Name}
          </p>
          <p>
            Status:{" "}
            {game.game_status === "waiting"
              ? "Waiting for opponent to join..."
              : game.game_status === "ready"
              ? "Both players are ready. Game will start soon!"
              : game.game_status === "playing"
              ? turn === playerBoard.player_id
                ? "Your turn to attack!"
                : "Opponent's turn, waiting..."
              : game.game_status === "finished"
              ? "Game over!"
              : "Placing ships..."}
          </p>
        </div>

        <div className='remaining-ships'>
          <p>Ship Remaining ship hits to Sink: {remainingShips}</p>
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
        <h3>Placement direction</h3>
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
      <div className="boards">
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
            <button onClick={handleLockBoard} disabled={ships.some(ship => !ship.placed)}>
              Lock Board
            </button>
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
      </>
      )}
      {isGameOver && (
        <GameOverPopup
          winner={winner}
          isPlayerWinner={isPlayerWinner}
          onClose={handleCloseGame}
        />
      )}
    </div>
  );
}

export default GamePage;