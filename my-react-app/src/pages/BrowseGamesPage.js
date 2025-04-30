import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingGames, joinGame, notifyPlayers } from '../utils.js/api';
import {jwtDecode} from 'jwt-decode';
import '../styles/BrowseGamesPage.css';

function BrowseGamesPage() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const pendingGames = await getPendingGames();
        setGames(pendingGames);
      } catch (err) {
        setError('Failed to fetch games. Please try again.');
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
        alert('Game joined successfully! Redirecting to the game page...');
        navigate(`/game/${gameId}`);
    } catch (err) {
        setError('Failed to join game. Please try again.');
    }
  };

  return (
    <div className="browse-games-page">
      <h1>Browse Pending Games</h1>
      {error && <p className="error">{error}</p>}
      <ul>
        {games.map((game) => (
          <li key={game.game_id}>
            Game ID: {game.game_id} - Player 1: {game.player1_id}
            <button onClick={() => handleJoinGame(game.game_id)}>Join Game</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BrowseGamesPage;