import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/api';
import { getAuthToken, clearAuthData, isAuthenticated } from '../utils/auth';
import { getErrorMessage } from '../utils/errorHandler';
import { toast } from 'react-toastify';
import '../styles/UserProfile.css';

// profile page - placeholder content really
function UserProfile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // fetch user data on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthenticated()) {
        navigate('/login');
        return;
      }

      const token = getAuthToken();
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const userData = await getUser(token);

        // validate user data object
        if (!userData || typeof userData.user_id !== 'number') {
          setError('Invalid user data received. Please log in again.');
          clearAuthData();
          navigate('/login');
          return;
        }

        setUser(userData);
      } catch (err) {
        const errorMsg = getErrorMessage(err) || 'Failed to fetch user data';
        setError(errorMsg);

        clearAuthData();
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // handle logout
  const handleLogout = () => {
    clearAuthData();
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  if (error) {
    return (
      <div className='profile-page'>
        <div className='error-container'>
          <p className='error'>{error}</p>
          <button className='btn' onClick={handleLogout}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='profile-page'>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className='profile-page'>
        <p>No user data available.</p>
      </div>
    );
  }

  return (
    <div className='profile-page'>
      <header className='profile-header'>
        <img
          src='https://via.placeholder.com/150'
          alt='Profile'
          className='profile-image'
        />
        <h1>{user.username}</h1>
        <p className='bio'>'Welcome to your profile!'</p>
      </header>

      <div className='profile-info'>
        <h2>Account Details</h2>
        <p>
          <strong>Username:</strong> {user.username}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Member Since:</strong> {new Date(user.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className='profile-actions'>
        <h2>Actions</h2>
        <button className='btn disabled' disabled>
          Edit Profile (Coming Soon)
        </button>
        <button className='btn disabled' disabled>
          Change Password (Coming Soon)
        </button>
        <button className='btn btn-logout' onClick={handleLogout}>
          Logout
        </button>
        <button className='btn disabled' disabled>
          Delete Account (Coming Soon)
        </button>
      </div>
    </div>
  );
}

export default UserProfile;
