import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGameDetails, getBoardDetails, placeShip, lockBoard, attackOpponent, callBot, callBotAttack, startGame, getUserById, getUser, surrenderGame } from '../utils/api';
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

  const [attackLog, setAttackLog] = useState([]);
  const [shipsHealth, setShipsHealth] = useState([]);

  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isPlayerWinner, setIsPlayerWinner] = useState(false);

  const [showSurrenderModal, setShowSurrenderModal] = useState(false);

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

        const token = localStorage.getItem('token');
        const currentUser = await getUser(token);
        const currentUserId = currentUser.user_id;

        console.log("turn:", turn)
        setTurn(gameData.turn);

        const isPlayer1 = currentUserId === gameData.player1_id;
        const playerBoardData = await getBoardDetails(gameId, isPlayer1 ? gameData.player1_id : gameData.player2_id);
        const opponentBoardData = await getBoardDetails(gameId, isPlayer1 ? gameData.player2_id : gameData.player1_id);
        setPlayerBoard(playerBoardData);
        setOpponentBoard(opponentBoardData);

        const ships = playerBoardData.ships.map((ship) => ({
          type: ship.type,
          size: ship.ship_coordinates.length,
          hits: ship.ship_hits.length,
        }));
        setShipsHealth(ships);

        const player1 = await getUserById(gameData.player1_id);
        const player2 = gameData.player2_id ? await getUserById(gameData.player2_id) : { username: 'Waiting for Player...' };
        setPlayer1Name(player1.username);
        setPlayer2Name(player2.username);

      } catch (err) {
        setError('Failed to fetch game details. Please try again.');
      }
    };

    if (game?.game_status === 'waiting') {
      const interval = setInterval(fetchGameDetails, 3000);
      return () => clearInterval(interval);
    }

    fetchGameDetails();
  }, [gameId, game?.game_status]);




  const handleCloseGame = () => {
    clearActiveGameId();
    navigate('/');
  };

  const handleSurrender = async () => {
    try {
      const token = getAuthToken();
      const user = await getUser(token);
      const playerId = user.user_id;

      const result = await surrenderGame(gameId, playerId);
      clearActiveGameId();
      
      // Determine message based on game state
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
      console.log("placing ship on: ", playerBoard.board_id)

      await placeShip(playerBoard.board_id, selectedShip.type, previewCoordinates);

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

      setShips((prevShips) =>
        prevShips.map((ship) =>
          ship.type === selectedShip.type ? { ...ship, placed: true } : ship
        )
      );


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
        toast.info("Game started, its your turn");
      } else if (updateGame.game_status === 'waiting_for_opponent') {
        toast.info("Board locked. Waiting for opponent to lock board");
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

      const previousOpponentBoard = { ...opponentBoard }; // save the previous oppo board state
      const updatedGame = await attackOpponent(gameId, playerBoard.player_id, coordinates);
      // update game and turn state
      setGame(updatedGame);
      setTurn(updatedGame.turn);

      // fetch updated board
      const updatedOpponentBoard = await getBoardDetails(gameId, opponentBoard.player_id);
      setOpponentBoard(updatedOpponentBoard);

      const cellValue = updatedOpponentBoard.board_state[coordinates[0]][coordinates[1]];
      setAttackLog((prevLog) => [
        ...prevLog,
        `You attacked (${coordinates[0] + 1}, ${coordinates[1] + 1}): ${cellValue === 'H' ? 'Hit!' : 'Miss!'}`,
      ]);

      if (updatedGame.game_status === 'finished') {
        setIsGameOver(true);
        setWinner(updatedGame.winner_id);
        setIsPlayerWinner(updatedGame.winner_id === playerBoard.player_id);
      }

      if (updatedGame.game_status === 'finished') {
        const isWinner = updatedGame.winner_id === playerBoard.player_id;
        toast[isWinner ? 'success' : 'error'](
          `Game Over! ${isWinner ? '🎉 You won!' : '😔 You lost.'}`
        );
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
        const previousPlayerBoard = { ...playerBoard }; // save state before attack
        const updatedGame = await callBotAttack(gameId);
        // update game and turn state
        setGame(updatedGame);
        setTurn(updatedGame.turn);

        // compare board states after bot attacks
        const updatedPlayerBoard = await getBoardDetails(gameId, playerBoard.player_id);
        const attackCoordinates = findAttackCoordinates(previousPlayerBoard.board_state, updatedPlayerBoard.board_state);
        const cellValue = updatedPlayerBoard.board_state[attackCoordinates[0]][attackCoordinates[1]];

        // update player board state
        setPlayerBoard(updatedPlayerBoard);
        setAttackLog((prevLog) => [
          ...prevLog,
          `Bot attacked (${attackCoordinates[0] + 1}, ${attackCoordinates[1] + 1}): ${cellValue === 'H' ? 'Hit!' : 'Miss!'}`,
        ]);

        if (updatedGame.game_status === 'finished') {
          const isWinner = updatedGame.winner_id === playerBoard.player_id;
          toast[isWinner ? 'success' : 'error'](
            `Game Over! ${isWinner ? '🎉 You won!' : '😔 You lost.'}`
          );
        }
      } catch (err) {
        setError("Bot failed to attack.")
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
    return null; // F if this happens
  };

  // useEffect(() => {
  //   console.log("Game state updated:", game);
  //   console.log("Player board updated:", playerBoard);
  //   console.log("Opponent board updated:", opponentBoard);
  // }, [game, playerBoard, opponentBoard]);

  return (
    <div className="game-page">
      <div className="game-header">
        <h1>Battleship Game</h1>
        <div className="game-controls-top">
          {game && game.game_status !== 'finished' && (
            <button 
              className="btn-surrender" 
              onClick={() => setShowSurrenderModal(true)}
              title={game.game_status === 'waiting' ? 'Cancel this game' : 'Forfeit the game'}
            >
              {game.game_status === 'waiting' ? '❌ Cancel Game' : '⚔️ Surrender'}
            </button>
          )}
          {game && game.game_status === 'finished' && (
            <button 
              className="btn-leave" 
              onClick={handleCloseGame}
              title="Leave the game"
            >
              🚪 Leave Game
            </button>
          )}
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      {showSurrenderModal && (
        <ConfirmModal
          title={game.game_status === 'waiting' ? 'Cancel Game?' : 'Surrender Game?'}
          message={game.game_status === 'waiting' 
            ? 'Are you sure you want to cancel this game? It will be deleted.'
            : 'Are you sure you want to surrender? You will lose this game and your opponent will be declared the winner.'}
          onConfirm={handleSurrender}
          onCancel={() => setShowSurrenderModal(false)}
          confirmText={game.game_status === 'waiting' ? 'Yes, Cancel Game' : 'Yes, Surrender'}
          cancelText="Keep Playing"
          isDangerous={true}
        />
      )}

      {waitingMessage && (
        <div className="waiting-message">
          <p>{waitingMessage}</p>
          <button onClick={handleCallBot}>Call Bot</button>
        </div>
      )}

      {!game || !playerBoard || !opponentBoard ? (
        <div className="loading">
          <ClipLoader color="#007bff" size={50} aria-label="Loading" />
          <p>Loading...</p>
        </div>
      ) : (
        <>
          <div className="game-status" aria-live="polite">
            <div className="players-info">
              <div className="player-card">
                <p className={`player-name ${playerBoard?.player_id === game.player1_id ? 'you' : ''}`}>
                  {player1Name}
                  {playerBoard?.player_id === game.player1_id && ' (You)'}
                </p>
              </div>
              <div className="vs-divider">VS</div>
              <div className="player-card">
                <p className={`player-name ${playerBoard?.player_id === game.player2_id ? 'you' : ''}`}>
                  {player2Name}
                  {playerBoard?.player_id === game.player2_id && ' (You)'}
                </p>
              </div>
            </div>

            <div className="game-phase-info">
              {game.game_status === "waiting" && (
                <p className="status waiting">
                  ⏳ Waiting for opponent to join...
                </p>
              )}
              
              {game.game_status === "in_progress" && (
                <p className="status ship-placement">
                  🎯 Place your ships and lock your board to start
                </p>
              )}
              
              {game.game_status === "waiting_for_opponent" && (
                <p className="status waiting">
                  ⏳ {isLocked ? "Board locked. Waiting for opponent..." : "Opponent locked their board. Lock yours!"}
                </p>
              )}
              
              {game.game_status === "playing" && (
                <>
                  {turn === playerBoard.player_id ? (
                    <p className="status your-turn">
                      ✨ YOUR TURN! Attack opponent's board
                    </p>
                  ) : (
                    <p className="status opponent-turn">
                      ⏳ Opponent's turn... waiting for their attack
                    </p>
                  )}
                </>
              )}
              
              {game.game_status === "finished" && (
                <p className="status finished">
                  ✅ Game Over!
                </p>
              )}
            </div>
          </div>

          {/* Ship Selection Section */}
          <div className="ship-selection">
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

          {/* Placement Direction Section */}
          <div className="placement-direction">
            <h3>Placement Direction</h3>
            <button
              onClick={() => setPlacementDirection("horizontal")}
              disabled={placementDirection === "horizontal" || isLocked}
            >
              Horizontal
            </button>
            <button
              onClick={() => setPlacementDirection("vertical")}
              disabled={placementDirection === "vertical" || isLocked}
            >
              Vertical
            </button>
          </div>

          <div className="game-layout">
            {/* Left: Attack Log */}
            <div className="attack-log">
              <h2>Attack Log</h2>
              <ul>
                {attackLog.length === 0 ? (
                  <li className="log-empty">No attacks yet</li>
                ) : (
                  attackLog.map((log, index) => {
                    const isHit = log.includes('Hit');
                    const isBotAttack = log.includes('Bot');
                    return (
                      <li key={index} className={`log-entry ${isHit ? 'hit' : 'miss'} ${isBotAttack ? 'bot' : 'player'}`}>
                        {log}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            {/* Center: Boards */}
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
                  <div className="ship-actions">
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

            {/* Right: Ship Health */}
            <div className="ships-health">
              <h2>Your Ships</h2>
              <ul>
                {shipsHealth.map((ship) => {
                  const damagePercent = (ship.hits / ship.size) * 100;
                  const shipStatus = ship.hits === 0 ? '🟢' : ship.hits < ship.size ? '🟡' : '🔴';
                  return (
                    <li key={ship.type} title={`${ship.type}: ${ship.hits}/${ship.size} hits`}>
                      <div className="ship-health-row">
                        <span className="ship-name">{shipStatus} {ship.type}</span>
                        <span className="ship-status">{ship.hits}/{ship.size}</span>
                      </div>
                      <div className="health-bar">
                        <div 
                          className="health-bar-fill" 
                          style={{
                            width: `${100 - damagePercent}%`,
                            backgroundColor: damagePercent === 0 ? '#28a745' : damagePercent < 100 ? '#ffc107' : '#dc3545'
                          }}
                        ></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
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