import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame } from '../utils.js/api';
import {jwtDecode} from 'jwt-decode';
import { toast } from 'react-toastify';
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
      toast.info(`Game created! Game ID: ${game.game_id}`);
      // got to game page
      navigate(`/game/${game.game_id}`); // Redirect to browse games
    } catch (err) {
      setError('Failed to create game. Please try again.');
    }
  };

  return (
    <div className="create-game-page">
      <header className="create-game-header">
        <h1>Create a New Game</h1>
        <p>Play against another player or call the bot.</p>
      </header>
      <section className="create-game-actions">
        <button className='btn' onClick={handleCreateGame}>Create Game</button>
        {error && <p className="error">{error}</p>}
        {waitingMessage && <p className="waiting-message">{waitingMessage}</p>}
      </section>
    </div>
  );
}

export default CreateGamePage;