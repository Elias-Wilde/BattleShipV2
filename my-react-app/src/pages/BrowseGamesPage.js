import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingGames, joinGame, notifyPlayers, getUserById } from '../utils.js/api';
import {jwtDecode} from 'jwt-decode';
import { toast } from 'react-toastify';
import Footer from '../components/Footer';
import '../styles/BrowseGamesPage.css';

function BrowseGamesPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usernames, setUsernames] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const pendingGames = await getPendingGames();
        setGames(pendingGames);

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
        setError('Failed to fetch games. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const handleJoinGame = async (gameId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
        const decodedToken = jwtDecode(token);
        const playerId = decodedToken.user_id;
        await joinGame(gameId, playerId);
        localStorage.setItem('activeGameId', gameId);
        await notifyPlayers(gameId);
        // TODO, start game,
        toast.info('Game joined successfully! Redirecting to the game page...');
        navigate(`/game/${gameId}`);
    } catch (err) {
        setError('Failed to join game. Please try again.');
    }
  };

  return (
    <div className="browse-games-page">
      <header className="browse-games-header">
        <h1>Browse Games</h1>
        <p>Join an existing game to start playing!</p>
      </header>
      <section className="games-list">
        {error && <p className="error">{error}</p>}
        {loading && <p className="loading">{loading}</p>}
          {games.map((game) => (
              <div key={game.id} className="game-card">
              <h2>{game.name || `Game ${game.game_id}`}</h2>
              <p>
                <strong>Player 1:</strong> {usernames[game.player1_id] || 'Loading...'}
              </p>
              <p>
                <strong>Player 2:</strong> {game.player2_id ? usernames[game.player2_id] || 'Loading...' : 'Waiting for player...'}
              </p>
              <p>
                <strong>Status:</strong> {game.status}
              </p>
              <button className='btn' onClick={() => handleJoinGame(game.game_id)}>Join Game</button>
            </div>
          ))}
      </section>
    </div>
  );
}

export default BrowseGamesPage;