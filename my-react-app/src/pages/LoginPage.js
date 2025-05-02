import React, {useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../utils.js/api';
import '../styles/LoginPage.css';
import axios from 'axios';


function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const payload = new URLSearchParams({
                grant_type: 'password',
                username,
                password,
            });
            const response = await loginUser(payload);

            localStorage.setItem('token', response.access_token); // store auth token in local storage
            navigate('/profile'); // got to profiel page on success
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    return (
        <div className='login-page'>
            <form className='login-form' onSubmit={handleLogin}>
                <h1>Login</h1>
                <input
                type='text'
                placeholder='Username'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                />
                <input
                type='password'
                placeholder='Password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                />
                <button type='submit' className='btn'>Login</button>
                <p className="register-link">Dont have an account yet? <a href="/register">Register</a></p>
            </form>
            {error && <p className='error'>{error}</p>}

        </div>
    );
}

export default LoginPage;

