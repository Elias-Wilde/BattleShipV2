import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame, getUser as fetchUser } from '../utils/api';
import { getAuthToken, getActiveGameId, setActiveGameId } from '../utils/auth';
import { getErrorMessage, logError } from '../utils/errorHandler';
import { toast } from 'react-toastify';
import '../styles/CreateGamePage.css';

function CreateGamePage() {
  const [error, setError] = useState('');
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const activeGameId = getActiveGameId();
    if (activeGameId) {
      setHasActiveGame(true);
    }
  }, []);

  const handleCreateGame = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    if (hasActiveGame) {
      toast.error('You already have an active game. Finish or leave it first.');
      return;
    }

    try {
      const user = await fetchUser(token);
      const game = await createGame(user.user_id);
      setActiveGameId(game.game_id);
      toast.success(`Game created! Game ID: ${game.game_id}`);
      navigate(`/game/${game.game_id}`);
    } catch (err) {
      const errorMsg = getErrorMessage(err) || 'Failed to create game. Please try again.';
      logError(err, 'CreateGamePage.handleCreateGame()');
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="create-game-page">
      <header className="create-game-header">
        <h1>Create a New Game</h1>
        <p>Play against another player or call the bot.</p>
      </header>
      <section className="create-game-actions">
        {hasActiveGame && (
          <div className="active-game-message">
            <p>⚠️ You already have an active game in progress.</p>
            <button 
              className="btn-secondary" 
              onClick={() => navigate('/browse-games')}
            >
              Go to My Active Game
            </button>
          </div>
        )}
        <button 
          className='btn' 
          onClick={handleCreateGame}
          disabled={hasActiveGame}
        >
          {hasActiveGame ? 'Finish Your Game First' : 'Create Game'}
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
}

export default CreateGamePage;