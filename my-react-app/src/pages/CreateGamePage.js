import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame, getUser as fetchUser, surrenderGame } from '../utils/api';
import { getAuthToken, getActiveGameId, setActiveGameId, clearActiveGameId, isAuthenticated } from '../utils/auth';
import { getErrorMessage, logError } from '../utils/errorHandler';
import { toast } from 'react-toastify';
import '../styles/CreateGamePage.css';


function CreateGamePage() {
  const [error, setError] = useState('');
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const [activeGameId, setActiveGameIdState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();


  // check for active game on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    const storedGameId = getActiveGameId();
    if (storedGameId) {
      setHasActiveGame(true);
      setActiveGameIdState(storedGameId);
    }
  }, [navigate]);


  const handleCreateGame = async () => {
    setError('');

    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    if (hasActiveGame) {
      toast.error('You already have an active game. Finish or leave it first.');
      return;
    }

    setIsLoading(true);

    try {
      const user = await fetchUser(token);

      if (!user || typeof user.user_id !== 'number' || user.user_id <= 0) {
        setError('Invalid user session. Please log in again.');
        navigate('/login');
        return;
      }

      const game = await createGame(user.user_id);

      if (!game || typeof game.game_id !== 'number') {
        setError('Failed to create game. Invalid response from server.');
        return;
      }

      setActiveGameId(game.game_id);
      toast.success(`Game created! Game ID: ${game.game_id}`);
      navigate(`/game/${game.game_id}`);
    } catch (err) {
      setIsLoading(false);
      const errorMsg = getErrorMessage(err) || 'Failed to create game. Please try again.';
      logError(err, 'CreateGamePage.handleCreateGame()');
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className='create-game-page'>
      <header className='create-game-header'>
        <h1>Create a New Game</h1>
        <p>Play against another player or call the bot.</p>
      </header>
      <section className='create-game-actions'>
        {hasActiveGame && (
          <div className='active-game-message'>
            <p>⚠️ You already have an active game in progress.</p>
            <div className='active-game-buttons'>
              <button
                className='btn-secondary'
                onClick={() => navigate(`/game/${activeGameId}`)}
              >
                Resume My Active Game
              </button>
              <button
                className='btn-cancel-secondary'
                onClick={async () => {
                  try {
                    const token = getAuthToken();
                    const user = await fetchUser(token);
                    await surrenderGame(activeGameId, user.user_id);
                    clearActiveGameId();
                    setHasActiveGame(false);
                    toast.success('Game cancelled!');
                  } catch (err) {
                    const errorMsg = getErrorMessage(err) || 'Failed to cancel game';
                    setError(errorMsg);
                    toast.error(errorMsg);
                  }
                }}
              >
                Cancel Game
              </button>
            </div>
          </div>
        )}
        <button
          className='btn'
          onClick={handleCreateGame}
          disabled={hasActiveGame || isLoading}
        >
          {isLoading ? 'Creating Game...' : hasActiveGame ? 'Finish Your Game First' : 'Create Game'}
        </button>
        {error && <p className='error'>{error}</p>}
      </section>
    </div>
  );
}

export default CreateGamePage;