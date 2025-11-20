import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllGames, joinGame, getUser, callBot, surrenderGame } from '../utils/api';
import { getAuthToken, setActiveGameId, clearActiveGameId, isAuthenticated, getActiveGameId } from '../utils/auth';
import { getErrorMessage } from '../utils/errorHandler';
import { toast } from 'react-toastify';
import '../styles/BrowseGamesPage.css';

// BrowseGamesPage Component

function BrowseGamesPage() {
    const [allGames, setAllGames] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [joiningGameId, setJoiningGameId] = useState(null);
    const [callingBotGameId, setCallingBotGameId] = useState(null);
    const navigate = useNavigate();

    // redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        const fetchGamesAndUser = async () => {
            try {
                setLoading(true);
                // Get current user info
                const token = getAuthToken();
                const user = await getUser(token);
                setCurrentUserId(user.user_id);

                // Fetch all active games
                const games = await getAllGames();
                setAllGames(games || []);
                setError('');
            } catch (err) {
                setError(getErrorMessage(err) || 'Failed to load games');
            } finally {
                setLoading(false);
            }
        };

        fetchGamesAndUser();

        // polling games, refresh every 5 seconds
        const interval = setInterval(fetchGamesAndUser, 5000);
        return () => clearInterval(interval);
    }, [navigate]);


    const validateGameId = (gameId) => {
        return typeof gameId === 'number' && gameId > 0;
    };


    const handleJoinGame = async (gameId) => {
        try {
            if (!validateGameId(gameId)) {
                setError('Invalid game ID');
                return;
            }

            setJoiningGameId(gameId);

            if (!currentUserId || typeof currentUserId !== 'number') {
                setError('Invalid user session. Please log in again.');
                setJoiningGameId(null);
                return;
            }

            await joinGame(gameId, currentUserId);

            // store game id for session management
            setActiveGameId(gameId);

            toast.success('Successfully joined game!');
            navigate(`/game/${gameId}`);
        } catch (err) {
            setJoiningGameId(null);
            const errorMsg = getErrorMessage(err);

            // handle specific errors
            if (err.response?.status === 403) {
                setError('You do not have permission to join this game');
            } else if (err.response?.status === 400) {
                setError('Game is full or no longer available');
            } else if (err.response?.status === 429) {
                setError('Too many requests. Please wait before trying again');
            } else {
                setError(errorMsg || 'Failed to join game');
            }
            toast.error(errorMsg || 'Failed to join game');
        }
    };

    // handle calling the bot
    const handleCallBot = async (gameId) => {
        try {
            if (!validateGameId(gameId)) {
                setError('Invalid game ID');
                return;
            }

            setCallingBotGameId(gameId);

            await callBot(gameId);

            setActiveGameId(gameId);

            toast.success('Bot called successfully!');
            navigate(`/game/${gameId}`);
        } catch (err) {
            setCallingBotGameId(null);
            const errorMsg = getErrorMessage(err);

            if (err.response?.status === 403) {
                setError('You do not have permission to call bot in this game');
            } else if (err.response?.status === 400) {
                setError('Cannot call bot for this game. Check game status.');
            } else if (err.response?.status === 429) {
                setError('Too many requests. Please wait before trying again');
            } else {
                setError(errorMsg || 'Failed to call bot');
            }
            toast.error(errorMsg || 'Failed to call bot');
        }
    };

    const handleCancelGame = async (gameId) => {
        try {
            if (!validateGameId(gameId)) {
                setError('Invalid game ID');
                return;
            }

            if (!currentUserId || typeof currentUserId !== 'number') {
                setError('Invalid user session. Please log in again.');
                return;
            }

            await surrenderGame(gameId, currentUserId);

            // clear game from localstage
            clearActiveGameId();

            toast.success('Game cancelled successfully!');

            setAllGames(allGames.filter(g => g.game_id !== gameId));

            navigate('/');
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg || 'Failed to cancel game');
            toast.error(errorMsg || 'Failed to cancel game');
        }
    };

    if (loading) {
        return (
            <div className="browse-games-page">
                <div className="loading">Loading available games...</div>
            </div>
        );
    }

    return (
        <div className="browse-games-page">
            <h1>Available Games</h1>

            {error && (
                <div className="error-container">
                    <p className="error">{error}</p>
                </div>
            )}

            {allGames.length === 0 ? (
                <div className="no-games-message">
                    <p>No games available at the moment.</p>
                    <p>
                        <a href="/create">Create a new game</a> to get started!
                    </p>
                </div>
            ) : (
                <div className="games-list">
                    {allGames.map((game) => {
                        const isOwnGame = currentUserId === game.player1_id;
                        const isWaitingForPlayers = game.game_status === 'waiting';
                        const isActiveGame = isOwnGame && game.game_status !== 'waiting';

                        return (
                            <div key={game.game_id} className={`game-card ${isActiveGame ? 'active-game' : ''}`}>
                                <div className="game-header">
                                    <h3>Game #{game.game_id}</h3>
                                    <span className={`status-badge ${game.game_status}`}>
                                        {game.game_status}
                                    </span>
                                </div>
                                <div className="game-details">
                                    <p>
                                        <strong>Created by:</strong>{' '}
                                        {game.player1?.username || 'Unknown Player'}
                                        {isOwnGame && <span className="own-game-badge"> (Your Game)</span>}
                                        {isActiveGame && <span className="active-badge"> ⚡ Active</span>}
                                    </p>
                                    <p>
                                        <strong>Status:</strong>{' '}
                                        {game.game_status === 'waiting'
                                            ? 'Waiting for second player'
                                            : game.game_status === 'in_progress'
                                            ? 'Players joining / placing ships'
                                            : game.game_status === 'waiting_for_opponent'
                                            ? 'Waiting for opponent to lock board'
                                            : game.game_status === 'playing'
                                            ? 'Game in progress'
                                            : game.game_status}
                                    </p>
                                    {game.player2 && (
                                        <p>
                                            <strong>Players:</strong> {game.player1?.username} vs {game.player2?.username}
                                        </p>
                                    )}
                                    <p>
                                        <strong>Created:</strong>{' '}
                                        {new Date(game.created_at).toLocaleString()}
                                    </p>
                                </div>

                                {isWaitingForPlayers && isOwnGame ? (
                                    <div className="game-actions">
                                        <button
                                            className="btn-call-bot"
                                            onClick={() => handleCallBot(game.game_id)}
                                            disabled={callingBotGameId === game.game_id}
                                        >
                                            {callingBotGameId === game.game_id ? 'Calling Bot...' : 'Call Bot'}
                                        </button>
                                        <button
                                            className="btn-cancel"
                                            onClick={() => handleCancelGame(game.game_id)}
                                            disabled={callingBotGameId === game.game_id}
                                        >
                                            Cancel Game
                                        </button>
                                    </div>
                                ) : isActiveGame ? (
                                    <button
                                        className="btn-resume"
                                        onClick={() => navigate(`/game/${game.game_id}`)}
                                    >
                                        Resume Game
                                    </button>
                                ) : !isOwnGame && isWaitingForPlayers ? (
                                    <button
                                        className="btn-join"
                                        onClick={() => handleJoinGame(game.game_id)}
                                        disabled={joiningGameId === game.game_id}
                                    >
                                        {joiningGameId === game.game_id ? 'Joining...' : 'Join Game'}
                                    </button>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default BrowseGamesPage;
