/**
 * Error handling utility
 * Catches API errors and returns clean, user-friendly messages
 */

const ErrorTypes = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// Parse error from axios response
export const parseError = (error) => {
    // No response = network/connection issue
    if (!error.response) {
        return {
            type: ErrorTypes.NETWORK_ERROR,
            message: 'Network error. Please check your connection.',
            statusCode: null,
            details: error.message,
        };
    }

    const { status, data } = error.response;

    switch (status) {
        case 400:
            return {
                type: ErrorTypes.VALIDATION_ERROR,
                message: data?.detail || 'Invalid input. Please check your data.',
                statusCode: 400,
                details: data,
            };
        case 401:
            return {
                type: ErrorTypes.AUTH_ERROR,
                message: 'Session expired. Please log in again.',
                statusCode: 401,
                details: data,
            };
        case 403:
            return {
                type: ErrorTypes.PERMISSION_ERROR,
                message: data?.detail || 'You do not have permission to perform this action.',
                statusCode: 403,
                details: data,
            };
        case 404:
            return {
                type: ErrorTypes.NOT_FOUND,
                message: data?.detail || 'Resource not found.',
                statusCode: 404,
                details: data,
            };
        case 500:
        case 502:
        case 503:
            return {
                type: ErrorTypes.SERVER_ERROR,
                message: 'Server error. Please try again later.',
                statusCode: status,
                details: data,
            };
        default:
            return {
                type: ErrorTypes.UNKNOWN_ERROR,
                message: data?.detail || 'An unexpected error occurred.',
                statusCode: status,
                details: data,
            };
    }
};

// Get user-friendly message from error
export const getErrorMessage = (error) => {
    const parsedError = parseError(error);
    return parsedError.message;
};

// Log error to console (can extend for error tracking services)
export const logError = (error, context = 'Unknown') => {
    const parsedError = parseError(error);
    console.error(`[${context}] Error:`, {
        type: parsedError.type,
        message: parsedError.message,
        statusCode: parsedError.statusCode,
        details: parsedError.details,
    });
};

export default {
    ErrorTypes,
    parseError,
    getErrorMessage,
    logError,
};
