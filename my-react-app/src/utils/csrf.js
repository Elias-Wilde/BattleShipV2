// Anti CSRF Token Management
// anti CSRF token retrieval and injection for state-changing requests
// double submit cookie pattern
import axios from 'axios';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';


// get anti CSRF token from cookies
export const getCSRFToken = () => {
    // try to get from document.cookie
    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {
        const trimmedCookie = cookie.trim();
        if (trimmedCookie.startsWith(CSRF_COOKIE_NAME + '=')) {
            const token = trimmedCookie.substring((CSRF_COOKIE_NAME + '=').length);
            if (token) {
                console.log('CSRF token found in cookies');
                return token;
            }
        }
    }
    console.warn('CSRF token not found in document.cookie');
    console.warn('Available cookies:', document.cookie);
    return null;
};

// get headers with CSRF token for state-changing requests
export const getCSRFHeaders = () => {
    const token = getCSRFToken();
    if (!token) {
        console.error('CSRF token is missing! Initialize CSRF first.');
        return {};
    }
    const headers = {
        [CSRF_HEADER_NAME]: token
    };
    console.log('getCSRFHeaders() returning:', {
        headerName: CSRF_HEADER_NAME,
        token: token.substring(0, 10) + '...',
        fullHeaders: headers
    });
    return headers;
};


// Initialize anti-CSRF token by making a GET request
// This has to be called on app initialization before any POST requests
// The backend will set the csrf-token cookie on this GET response!
// public /api/csrf-token endpoint with no authentication

export const initializeCSRFToken = async () => {
    try {
        console.log('Initializing CSRF token...');
        const endpoint = `${API_BASE_URL}/api/csrf-token`;
        console.log('Making GET request to:', endpoint);

        const response = await axios.get(endpoint, {
            withCredentials: true // !include cookies in GET request!
        });

        console.log('GET request successful, response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('All cookies now available:', document.cookie);

        // Check if token was set
        const token = getCSRFToken();
        if (token) {
            console.log('✓ CSRF token initialized successfully:', token.substring(0, 10) + '...');
            return token;
        } else {
            console.warn('⚠ CSRF token initialization completed but token not found in cookies');
            console.warn('Current cookies:', document.cookie);
            console.warn('This may cause registration to fail. Attempting to initialize again...');
            // one retry
            return initializeCSRFTokenRetry();
        }
    } catch (error) {
        console.error('✗ Failed to initialize CSRF token');
        console.error('Error details:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });
        return null;
    }
};

// if first initialization fails
const initializeCSRFTokenRetry = async () => {
    try {
        console.log('Retrying CSRF token initialization...');
        const endpoint = `${API_BASE_URL}/api/csrf-token`;

        const response = await axios.get(endpoint, {
            withCredentials: true
        });

        const token = getCSRFToken();
        if (token) {
            console.log('CSRF token initialized on retry:', token.substring(0, 10) + '...');
            return token;
        }
        return null;
    } catch (error) {
        console.error('CSRF token initialization retry failed');
        return null;
    }
};

export default {
    getCSRFToken,
    getCSRFHeaders,
    initializeCSRFToken,
};
