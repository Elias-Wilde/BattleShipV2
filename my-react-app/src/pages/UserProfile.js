import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils.js/api';
import axios from 'axios';
import '../styles/UserProfile.css';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login'); // Redirect to login if not authenticated
        return;
      }

      try {
        const userData = await getUser(token);
        setUser(userData);
      } catch (err) {
        setError('Failed to fetch user data');
        localStorage.removeItem('token'); // Clear invalid token
        navigate('/login'); // Redirect to login
      }
    };

    fetchUserProfile();
  }, [navigate]);

  if (error) {
    return <p>{error}</p>;
  }

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <h1>Welcome, {user.username}</h1>
        <p>View your account here</p>
      </header>
      <div className="profile-info">
        <h2>User Profile</h2>
        <p>Username: {user.username}</p>
        <p>Email: {user.email}</p>
      </div>
    </div>
  );
}

export default UserProfile;

