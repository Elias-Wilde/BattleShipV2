import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';
// 'http://localhost:8000'; //bakcend url
//  'https://battleshipv2-1.onrender.com' 

// Global axios interceptor for auth errors
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Token expired or invalid - redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('activeGameId');
            //window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// helper function to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Authentication required');
    }
    return { Authorization: `Bearer ${token}` };
};

// helper function to get optional auth headers (for endpoints that work with/without auth)
const getOptionalAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};


// ================== GAME ENDPOINTS ================= //

// create game
export const createGame = async (playerId) => {
    const response = await axios.post(
        `${API_BASE_URL}/games/?player1_id=${playerId}`, 
        {}, 
        { headers: getAuthHeaders() }
    );
    return response.data;
};

// get game details by gameId
export const getGameDetails = async (gameId) => {
    const response = await axios.get(`${API_BASE_URL}/games/${gameId}`, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// get all un-started games
export const getPendingGames = async () => {
    const response = await axios.get(`${API_BASE_URL}/games/games`, {
        headers: getAuthHeaders()
    });
    return response.data.filter((game) => game.game_status === 'waiting');
};

// join game with userId as second player
export const joinGame = async (gameId, playerId) => {
    const response = await axios.put(`${API_BASE_URL}/games/${gameId}/join?player2_id=${playerId}`, {}, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// start game ( attacking phase )
export const startGame = async (gameId) => {
    const response = await axios.put(`${API_BASE_URL}/games/${gameId}/start`, {}, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// attack opponent
export const attackOpponent = async (gameId, playerId, coordinates) => {
    const response = await axios.post(`${API_BASE_URL}/games/${gameId}/attack?player_id=${playerId}`, {
        coordinates,
    }, {
        headers: getAuthHeaders()
    });
    return response.data;
};

// ================== BOARD ENDPOINTS ================= //

// get board details by gameid and player id
export const getBoardDetails = async (gameId, playerId) => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Authentication required');
    }
    const response = await axios.get(`${API_BASE_URL}/boards/${gameId}/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
}

// lock board ( set board state and status )
export const lockBoard = async (boardId, boardState, boardStatus) => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Authentication required');
    }
    const response = await axios.put(`${API_BASE_URL}/boards/${boardId}`, {
        board_state: boardState,
        board_status: boardStatus,
    }, {
        headers: { Authorization: `Bearer ${token}` }
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
        headers: getAuthHeaders()
    });
    return response.data;
};

// ================== BOT ENDPOINTS ================= //

// bot call
export const callBot = async (gameId) => {
    const response = await axios.post(`${API_BASE_URL}/bot/${gameId}/call-bot`, {}, {
        headers: getAuthHeaders()
    });
    return response.data;
}

// bot attack call
export const callBotAttack = async (gameId) => {
    const response = await axios.post(`${API_BASE_URL}/bot/${gameId}/bot-attack`, {}, {
        headers: getAuthHeaders()
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
    });
    return response.data;
};

// login
export const loginUser = async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, payload, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
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
        headers: getOptionalAuthHeaders()
    });
    return response.data;
}

// stuff

// send notification to both players that game is ready to start
export const notifyPlayers = async (gameId) => {
    // TODO, build endpint and notify logic for this
    console.log(`Game ${gameId} is ready to start`);
};


// // create game with user id
// export const createGame = async (playerId) => {
//     try {
//         const token = localStorage.getItem('token');
//         console.log('Token exists:', !!token);
//         console.log('Player ID:', playerId);
        
//         if (!token) {
//             throw new Error('No authentication token found. Please log in.');
//         }
        
//         const response = await axios.post(
//             `${API_BASE_URL}/games/?player1_id=${playerId}`, 
//             {}, 
//             {
//                 headers: { Authorization: `Bearer ${token}` }
//             }
//         );
//         return response.data;
//     } catch (error) {
//         console.error('Create game error:', error.response?.data || error.message);
//         throw error;
//     }
// };