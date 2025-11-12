import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/api';
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
        <img
          src="https://via.placeholder.com/150" // Placeholder profile image
          alt="Profile"
          className="profile-image"
        />
        <h1>{user.username}</h1>
        <p className="bio">"This is a placeholder bio. Add something about yourself here!"</p>
      </header>

      <div className="profile-info">
        <h2>Account Details</h2>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Member Since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
      </div>

      <div className="profile-actions">
        <h2>Actions</h2>
        <button className="btn disabled" disabled>
          Edit Profile (Coming Soon)
        </button>
        <button className="btn disabled" disabled>
          Change Password (Coming Soon)
        </button>
        <button className="btn disabled" disabled>
          Delete Account (Coming Soon)
        </button>
      </div>
    </div>
  );
}

export default UserProfile;

