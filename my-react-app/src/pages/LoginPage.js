import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../utils/api';
import { setAuthToken, isAuthenticated } from '../utils/auth';
import { getErrorMessage } from '../utils/errorHandler';
import { getCSRFToken, initializeCSRFToken } from '../utils/csrf';
import '../styles/LoginPage.css';


function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [csrfReady, setCSRFReady] = useState(false);
    const navigate = useNavigate();

    // check anti srf token on mount
    useEffect(() => {
        const ensureCSRFToken = async () => {
            const token = getCSRFToken();
            if (token) {
                console.log('CSRF token already available');
                setCSRFReady(true);
            } else {
                console.log('Initializing CSRF token for login...');
                const result = await initializeCSRFToken();
                if (result) {
                    console.log('CSRF token initialized successfully');
                    setCSRFReady(true);
                } else {
                    console.warn('Failed to initialize CSRF token, login may fail');
                    setCSRFReady(true);
                }
            }
        };
        ensureCSRFToken();
    }, []);

    // redirect if authenticated
    useEffect(() => {
        if (isAuthenticated()) {
            navigate('/profile');
        }
    }, [navigate]);


    const validateInput = () => {
        const errors = {};

        // validate username
        if (!username) {
            errors.username = 'Username is required';
        } else if (username.length < 3 || username.length > 50) {
            errors.username = 'Username must be between 3 and 50 characters';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
        }

        // validate password
        if (!password) {
            errors.password = 'Password is required';
        } else if (password.length > 500) {
            errors.password = 'Password is too long';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };


    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateInput()) {
            return;
        }

        if (!getCSRFToken()) {
            setError('Security token not initialized. Please refresh the page and try again.');
            return;
        }

        setIsLoading(true);

        try {
            // URLSearchParams for OAuth2 compliance. todo
            const payload = new URLSearchParams({
                grant_type: 'password',
                username,
                password,
            });

            const response = await loginUser(payload);

            // store token securely in localStorage
            // todo HttpOnly cookies
            setAuthToken(response.access_token);

            navigate('/profile');
        } catch (err) {
            setIsLoading(false);
            const errorMsg = getErrorMessage(err);

            // rate limit
            if (err.response?.status === 429) {
                setError('Too many login attempts. Please try again later.');
            }
            // error message to prevent username enumeration
            else if (err.response?.status === 401) {
                setError('Invalid username or password');
            } else {
                setError(errorMsg || 'An unexpected error occurred. Please try again.');
            }
        }
    };

    return (
        <div className='login-page'>
            <form className='login-form' onSubmit={handleLogin}>
                <h1>Login</h1>

                <div className='form-group'>
                    <input
                        type='text'
                        placeholder='Username'
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value);
                            // clear error when user types again
                            if (validationErrors.username) {
                                setValidationErrors({ ...validationErrors, username: '' });
                            }
                        }}
                        disabled={isLoading}
                        autoComplete='username'
                        required
                    />
                    {validationErrors.username && (
                        <span className='validation-error'>{validationErrors.username}</span>
                    )}
                </div>

                <div className='form-group'>
                    <input
                        type='password'
                        placeholder='Password'
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (validationErrors.password) {
                                setValidationErrors({ ...validationErrors, password: '' });
                            }
                        }}
                        disabled={isLoading}
                        autoComplete='current-password'
                        required
                    />
                    {validationErrors.password && (
                        <span className='validation-error'>{validationErrors.password}</span>
                    )}
                </div>

                <button type='submit' className='btn' disabled={isLoading || !csrfReady}>
                    {isLoading ? 'Logging in...' : !csrfReady ? 'Loading...' : 'Login'}
                </button>

                <p className='register-link'>
                    Don't have an account yet? <a href='/register'>Register</a>
                </p>
            </form>

            {error && (
                <div className='error-container'>
                    <p className='error'>{error}</p>
                </div>
            )}
        </div>
    );
}

export default LoginPage;
