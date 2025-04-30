import React, {useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
            const response = await axios.post('http://localhost:8000/auth/login', payload, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            localStorage.setItem('token', response.data.access_token); // store auth token in local storage
            navigate('/profile'); // got to profiel page on success
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    return (
        <div className='login-page'>
            <h1>Login</h1>
            <form onSubmit={handleLogin}>
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
                <button type='submit'>Login</button>
            </form>
            {error && <p className='error'>{error}</p>}
            <p className="register-link">Dont have an account yet? <a href="/register">Register</a></p>
        </div>
    );
}

export default LoginPage;

