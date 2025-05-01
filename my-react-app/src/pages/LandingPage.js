import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';


function LandingPage() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token'); // verify user is logged in / token exists

  return (
    <div className="landing-page">
      <header className='hero'>
          <h1>Welcome to Battleship!</h1>
          <p>Play the game and sink your oppenents ships!</p>
          <div className='button-container'>
            {isLoggedIn ? (
              <>
                <button className='btn' onClick={() => navigate('/profile')}>Go to Profile</button>
                <button className='btn' onClick={() => navigate('/create-game')}>Create Game</button>
                <button className='btn' onClick={() => navigate('/browse-games')}>Browse Games</button>
              </>
            ) : (
              <>
                <button className='btn' onClick={() => navigate('/login')}>Login</button>
                <button className='btn' onClick={() => navigate('/register')}>Register</button>
              </>
            )}
          </div>
      </header>
    </div>
  );
}


export default LandingPage;