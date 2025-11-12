import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingGames, joinGame, notifyPlayers, getUserById, getUser as fetchUser, callBot, surrenderGame } from '../utils/api';
import { getAuthToken, getActiveGameId, setActiveGameId, clearActiveGameId } from '../utils/auth';
import { getErrorMessage, logError } from '../utils/errorHandler';
import { toast } from 'react-toastify';
import '../styles/BrowseGamesPage.css';

function BrowseGamesPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usernames, setUsernames] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeGameId, setActiveGameId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      try {
        // Get current user
        const token = getAuthToken();
        if (token) {
          const user = await fetchUser(token);
          setCurrentUserId(user.user_id);
        }

        // Get active game if any
        const activeId = getActiveGameId();
        setActiveGameId(activeId);

        // Fetch pending games
        const pendingGames = await getPendingGames();
        setGames(pendingGames);

        // Fetch usernames
        const usernamesPromises = pendingGames.map(async (game) => {
          const player1Name = await getUserById(game.player1_id);
          const player2Name = game.player2_id ? await getUserById(game.player2_id) : null;

          return {
            player1_id: game.player1_id,
            player1_name: player1Name.username,
            player2_id: game.player2_id,
            player2_name: player2Name ? player2Name.username : 'Waiting for Player...',
          };
        });

        const usernamesData = await Promise.all(usernamesPromises);
        const usernamesMap = {};
        usernamesData.forEach((user) => {
          usernamesMap[user.player1_id] = user.player1_name;
          if (user.player2_id) {
            usernamesMap[user.player2_id] = user.player2_name;
          }
        });
        setUsernames(usernamesMap);
      } catch (err) {
        setError(getErrorMessage(err) || 'Failed to fetch games. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const handleJoinGame = async (gameId, isOwnGame) => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    // Prevent joining own game
    if (isOwnGame) {
      toast.warning('You cannot join your own game!');
      return;
    }

    // Prevent joining if already playing
    if (activeGameId) {
      toast.error('You are already in an active game. Finish or leave it first.');
      return;
    }

    try {
      await joinGame(gameId, currentUserId);
      setActiveGameId(gameId);
      toast.success('Game joined successfully! Redirecting to the game page...');
      navigate(`/game/${gameId}`);
    } catch (err) {
      const errorMsg = getErrorMessage(err) || 'Failed to join game. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleCallBot = async (gameId, isOwnGame) => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    if (!isOwnGame) {
      toast.error('You can only call a bot for your own game!');
      return;
    }

    try {
      await callBot(gameId);
      toast.success('Bot called successfully! Redirecting to the game page...');
      setActiveGameId(gameId);
      navigate(`/game/${gameId}`);
    } catch (err) {
      const errorMsg = getErrorMessage(err) || 'Failed to call bot. Please try again.';
      logError(err, 'BrowseGamesPage.handleCallBot()');
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleCancelGame = async (gameId) => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const user = await fetchUser(token);
      await surrenderGame(gameId, user.user_id);
      
      // Clear active game since it's been cancelled
      clearActiveGameId();
      
      toast.success('Game cancelled successfully!');
      // Refresh games list
      window.location.reload();
    } catch (err) {
      const errorMsg = getErrorMessage(err) || 'Failed to cancel game. Please try again.';
      logError(err, 'BrowseGamesPage.handleCancelGame()');
      toast.error(errorMsg);
    }
  };

  return (
    <div className="browse-games-page">
      <header className="browse-games-header">
        <h1>Browse Games</h1>
        <p>Join an existing game to start playing!</p>
      </header>
      
      {activeGameId && (
        <div className="active-game-banner">
          <div className="banner-content">
            <h2>🎮 You Have an Active Game!</h2>
            <p>You're currently playing in Game #{activeGameId}</p>
            <button 
              className="btn-goto-game"
              onClick={() => navigate(`/game/${activeGameId}`)}
            >
              Go to Your Game
            </button>
          </div>
        </div>
      )}

      <section className="games-list">
        {error && <p className="error">{error}</p>}
        {loading && <p className="loading">Loading games...</p>}
        
        {!loading && games.length === 0 && (
          <p className="no-games">No games available. Create a new game to get started!</p>
        )}

        {games.map((game) => {
          const isOwnGame = currentUserId === game.player1_id;
          const canJoin = !isOwnGame && !activeGameId;
          const hasOpponent = !!game.player2_id;

          return (
            <div key={game.game_id} className={`game-card ${isOwnGame ? 'own-game' : ''}`}>
              <div className="game-header">
                <h2>Game #{game.game_id}</h2>
                {isOwnGame && <span className="badge badge-own">Your Game</span>}
                {!hasOpponent && <span className="badge badge-waiting">Waiting for Player</span>}
              </div>

              <div className="game-info">
                <div className="player-info">
                  <p>
                    <strong>Player 1:</strong> {usernames[game.player1_id] || 'Loading...'}
                    {isOwnGame && ' (You)'}
                  </p>
                </div>
                <div className="player-info">
                  <p>
                    <strong>Player 2:</strong> {game.player2_id ? usernames[game.player2_id] || 'Loading...' : 'Waiting...'}
                  </p>
                </div>
              </div>

              <div className="game-actions">
                {isOwnGame && !hasOpponent ? (
                  <>
                    <button
                      className='btn btn-call-bot'
                      onClick={() => handleCallBot(game.game_id, isOwnGame)}
                      title="Call a bot to play against"
                    >
                      🤖 Call Bot
                    </button>
                    <button
                      className='btn btn-cancel'
                      onClick={() => handleCancelGame(game.game_id)}
                      title="Cancel this game"
                    >
                      ❌ Cancel Game
                    </button>
                  </>
                ) : (
                  <button
                    className='btn btn-join'
                    onClick={() => handleJoinGame(game.game_id, isOwnGame)}
                    disabled={isOwnGame || activeGameId}
                    title={isOwnGame ? 'Cannot join your own game' : activeGameId ? 'You are already in a game' : 'Join this game'}
                  >
                    {isOwnGame ? 'Your Game' : activeGameId ? 'Active Game' : 'Join Game'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default BrowseGamesPage;