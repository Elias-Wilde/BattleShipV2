/**
 * Auth utilities - localStorage wrapper for tokens and user data
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const ACTIVE_GAME_KEY = 'activeGameId';

// Token management
export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }
};

export const getAuthToken = () => {
    return localStorage.getItem(TOKEN_KEY);
};

export const isAuthenticated = () => {
    return !!getAuthToken();
};

// Clear all auth data on logout
export const clearAuthData = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_GAME_KEY);
};

// User data storage
export const setUser = (user) => {
    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
};

export const getUser = () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
};

// Active game tracking
export const setActiveGameId = (gameId) => {
    if (gameId) {
        localStorage.setItem(ACTIVE_GAME_KEY, gameId);
    }
};

export const getActiveGameId = () => {
    return localStorage.getItem(ACTIVE_GAME_KEY);
};

export const clearActiveGameId = () => {
    localStorage.removeItem(ACTIVE_GAME_KEY);
};

// Headers for API requests
export const getAuthHeader = () => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Authentication required');
    }
    return { Authorization: `Bearer ${token}` };
};

export const getOptionalAuthHeader = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export default {
    setAuthToken,
    getAuthToken,
    isAuthenticated,
    clearAuthData,
    setUser,
    getUser,
    setActiveGameId,
    getActiveGameId,
    clearActiveGameId,
    getAuthHeader,
    getOptionalAuthHeader,
};
