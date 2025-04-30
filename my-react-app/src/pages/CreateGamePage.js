import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../utils.js/api';
import {jwtDecode} from 'jwt-decode';
import '../styles/CreateGamePage.css';

function CreateGamePage() {
  const [error, setError] = useState('');
  const [waitingMessage, setWaitingMessage] = useState('');
  const navigate = useNavigate();

  const handleCreateGame = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decodedToken = jwtDecode(token);
      const playerId = decodedToken.user_id; // does this even work l
      const game = await createGame(playerId);
      localStorage.setItem('activeGameId', game.game_id); // store the active gameid in local storage
      alert(`Game created! Game ID: ${game.game_id}`);
      // got to game page
      navigate(`/game/${game.game_id}`); // Redirect to browse games
      // need wait for second player to join before fetching the game
      // updated, fetching in gamepage now
      // setWaitingMessage('Game created, waiting for second player to join.')
      // const interval = setInterval(async () => {
      //   const updatedGame = await getGameDetails(game.game_id);
      //   if (updatedGame.game_state === 'in_progess') {
      //     clearInterval(interval);
      //     setWaitingMessage('')
      //     // todo, start game animation
      //     alert('second player joined. Game starting');
      //   }
      // }, 3000);
    } catch (err) {
      setError('Failed to create game. Please try again.');
    }
  };

  return (
    <div className="create-game-page">
      <h1>Create a New Game</h1>
      <button onClick={handleCreateGame}>Create Game</button>
      {error && <p className="error">{error}</p>}
      {waitingMessage && <p className="waiting-message">{waitingMessage}</p>}
    </div>
  );
}

export default CreateGamePage;