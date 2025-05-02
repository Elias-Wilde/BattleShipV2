import axios from 'axios';

const API_BASE_URL = 'https://battleshipv2-1.onrender.com'
// 'http://localhost:8000'; //bakcend url


// start game ( attacking phase )
export const startGame = async (gameId) => {
    const response = await axios.put(`${API_BASE_URL}/games/${gameId}/start`);
    return response.data;
};


// bot call
export const callBot = async (gameId) => {
    const response = await axios.post(`${API_BASE_URL}/bot/${gameId}/call-bot`);
    return response.data;
}

// bot attack call
export const callBotAttack = async (gameId) => {
    const response = await axios.post(`${API_BASE_URL}/bot/${gameId}/bot-attack`);
    return response.data;
};

// create new user
export const registerUser = async (username, email, password) => {
    const response = await axios.post(`${API_BASE_URL}/users/`, {
        username,
        email,
        password,
    });
    return response.data;
};

export const getUser = async (token) => {
    const response = await axios.get(`${API_BASE_URL}/users/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

export const getUserById = async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/users/${userId}`);
    return response.data;
}

// create game with user id
export const createGame = async (playerId) => {
    const response = await axios.post(`${API_BASE_URL}/games/?player1_id=${playerId}`);
    return response.data;
};

// get all un-started games
export const getPendingGames = async () => {
    const response = await axios.get(`${API_BASE_URL}/games/games`);
    return response.data.filter((game) => game.game_status === 'waiting');
};

// join game with userId as second player
export const joinGame = async (gameId, playerId) => {
    const response = await axios.put(`${API_BASE_URL}/games/${gameId}/join?player2_id=${playerId}`);
    return response.data;
};

// send notification to both players that game is ready to start
export const notifyPlayers = async (gameId) => {
    // TODO, build endpint and notify logic for this
    console.log(`Game ${gameId} is ready to start`);
};

// get game details by gameId
export const getGameDetails = async (gameId) => {
    const response = await axios.get(`${API_BASE_URL}/games/${gameId}`);
    return response.data;
};

// get board details by gameid and player id
export const getBoardDetails = async (gameId, playerId) => {
    const response = await axios.get(`${API_BASE_URL}/boards/${gameId}/${playerId}`);
    return response.data;
}


export const placeShip = async (boardId, shipType, coordinates) => {
    const response = await axios.post(`${API_BASE_URL}/ships/`, {
        board_id: boardId,
        ship_type: shipType,
        ship_coordinates: coordinates,
    });
    return response.data;
}

export const lockBoard = async (boardId, boardState, boardStatus) => {
    const response = await axios.put(`${API_BASE_URL}/boards/${boardId}`, {
        board_state: boardState,
        board_status: boardStatus,
    });
    return response.data;
}

export const attackOpponent = async (gameId, playerId, coordinates) => {
    const response = await axios.post(`${API_BASE_URL}/games/${gameId}/attack?player_id=${playerId}`, {
        coordinates,
    });
    return response.data;
}
