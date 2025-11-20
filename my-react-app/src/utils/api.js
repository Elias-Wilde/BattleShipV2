import axios from 'axios';
import { getAuthHeader, getOptionalAuthHeader, clearAuthData } from './auth';
import { getCSRFHeaders } from './csrf';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

axios.defaults.withCredentials = true;

// global interceptor for auth errors
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // invalid or expired token
            clearAuthData();
        }
        return Promise.reject(error);
    }
);


// combune auth and csrf headers
const getSecureHeaders = () => {
    return {
        ...getAuthHeader(),
        ...getCSRFHeaders()
    };
};

// ================== GAME ENDPOINTS ================= //

// create game
export const createGame = async (playerId) => {
    const response = await axios.post(
        `${API_BASE_URL}/games/?player1_id=${playerId}`,
        {},
        { headers: getSecureHeaders() }
    );
    return response.data;
};

// get game details by gameId
export const getGameDetails = async (gameId) => {
    const response = await axios.get(`${API_BASE_URL}/games/${gameId}`, {
        headers: getAuthHeader()
    });
    return response.data;
};

// get all un-started games
export const getPendingGames = async () => {
    const response = await axios.get(`${API_BASE_URL}/games/games`, {
        headers: getAuthHeader()
    });
    return response.data.filter((game) => game.game_status === 'waiting');
};

// get all games (pending and active)
export const getAllGames = async () => {
    const response = await axios.get(`${API_BASE_URL}/games/games`, {
        headers: getAuthHeader()
    });
    // Return all games except finished ones
    return response.data.filter((game) => game.game_status !== 'finished');
};

// join game with userId as second player
export const joinGame = async (gameId, playerId) => {
    const response = await axios.put(`${API_BASE_URL}/games/${gameId}/join?player2_id=${playerId}`, {}, {
        headers: getSecureHeaders()
    });
    return response.data;
};

// start game ( attacking phase )
export const startGame = async (gameId) => {
    const response = await axios.put(`${API_BASE_URL}/games/${gameId}/start`, {}, {
        headers: getSecureHeaders()
    });
    return response.data;
};

// attack opponent
export const attackOpponent = async (gameId, playerId, coordinates) => {
    const response = await axios.post(`${API_BASE_URL}/games/${gameId}/attack?player_id=${playerId}`, {
        coordinates,
    }, {
        headers: getSecureHeaders()
    });
    return response.data;
};

// surrender game
export const surrenderGame = async (gameId, playerId) => {
    const response = await axios.post(`${API_BASE_URL}/games/${gameId}/surrender?player_id=${playerId}`, {}, {
        headers: getSecureHeaders()
    });
    return response.data;
};

// ================== BOARD ENDPOINTS ================= //

// get board details by gameid and player id
export const getBoardDetails = async (gameId, playerId) => {
    const response = await axios.get(`${API_BASE_URL}/boards/${gameId}/${playerId}`, {
        headers: getAuthHeader()
    });
    return response.data;
}

// lock board ( set board state and status )
export const lockBoard = async (boardId, boardState, boardStatus) => {
    const response = await axios.put(`${API_BASE_URL}/boards/${boardId}`, {
        board_state: boardState,
        board_status: boardStatus,
    }, {
        headers: getSecureHeaders()
    });
    return response.data;
}

// ================== SHIP ENDPOINTS ================= //

// place ship
export const placeShip = async (boardId, shipType, coordinates) => {
    const response = await axios.post(`${API_BASE_URL}/ships/`, {
        board_id: boardId,
        ship_type: shipType,
        ship_coordinates: coordinates,
    }, {
        headers: getSecureHeaders()
    });
    return response.data;
};

// ================== BOT ENDPOINTS ================= //

// bot call
export const callBot = async (gameId) => {
    const response = await axios.post(`${API_BASE_URL}/bot/${gameId}/call-bot`, {}, {
        headers: getSecureHeaders()
    });
    return response.data;
}

// bot attack call
export const callBotAttack = async (gameId) => {
    const response = await axios.post(`${API_BASE_URL}/bot/${gameId}/bot-attack`, {}, {
        headers: getSecureHeaders()
    });
    return response.data;
};

// ================== USER ENDPOINTS ================= //

// create new user
export const registerUser = async (username, email, password) => {
    const response = await axios.post(`${API_BASE_URL}/users/`, {
        username,
        email,
        password,
    }, {
        headers: getCSRFHeaders(),
        withCredentials: true // IMPORTANT: Must include credentials for cookies
    });
    return response.data;
};

// login
export const loginUser = async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, payload, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...getCSRFHeaders()
        },
        withCredentials: true
    });
    return response.data;
}

// get user by token
export const getUser = async (token) => {
    const response = await axios.get(`${API_BASE_URL}/users/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

// get user by id
export const getUserById = async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
        headers: getOptionalAuthHeader()
    });
    return response.data;
}

// TODO: send notification to both players that game is ready to start
export const notifyPlayers = async (gameId) => {
    // TODO: build endpoint and notify logic for this
    console.log(`Game ${gameId} is ready to start`);
};
