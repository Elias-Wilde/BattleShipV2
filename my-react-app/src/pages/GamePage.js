import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getGameDetails, getBoardDetails, placeShip, lockBoard, attackOpponent, callBot } from '../utils.js/api';
import Board from '../components/Board';
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

        setTurn(gameData.turn);

        const playerBoardData = await getBoardDetails(gameId, gameData.player1_id);
        const opponentBoardData = await getBoardDetails(gameId, gameData.player2_id);
        setPlayerBoard(playerBoardData);
        setOpponentBoard(opponentBoardData);
      } catch (err) {
        setError('Failed to fetch game details. Please try again.');
      }
    };

    fetchGameDetails();
  }, [gameId]);


  const handleCallBot = async () => {
    try {
      await callBot(gameId);
      // TODO, show bot response
      alert('Bot called successfully. Refreshing game');
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
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'failed to lock board. Please try again';
      setError(errorMessage);
    }
  };

  const handleAttack = async (coordinates) => {
    try {
      const updatedGame = await attackOpponent(gameId, playerBoard.player_id, coordinates);
      setGame(updatedGame);
      setTurn(updatedGame.turn);
    } catch (err) {
      setError('Failed to attack opponent. Please try again.');
    }
  };

  // if (!game || !playerBoard || !opponentBoard) {
  //   return <p>Loading...</p>;
  // }

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
        <p>Loading...</p>
      ) : (
        <>
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
    </div>
  );
}

export default GamePage;