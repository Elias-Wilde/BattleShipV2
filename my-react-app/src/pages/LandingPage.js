import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token'); // Check if the user is logged in

  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1>Welcome to Battleship!</h1>
        <p className="tagline">Sink your opponent's fleet before they sink yours!</p>
      </header>

      <div className="game-explanation">
        <h2>How to Play</h2>
        <p>
          Battleship is a classic strategy game where you and your opponent take turns attacking each other's hidden fleet. 
          Place your ships strategically, and try to guess where your opponent's ships are hidden. The first player to sink all of their opponent's ships wins!
        </p>
      </div>

      <div className="features">
        <h2>Features</h2>
        <ul>
          <li>🎮 Play against a challenging bot</li>
          <li>🌐 Multiplayer mode to play with friends</li>
          <li>📊 Track your stats and progress</li>
          <li>⚙️ Customize your fleet and strategies</li>
        </ul>
      </div>

      <div className="call-to-action">
        <h2>Get Started</h2>
        <button
          className="btn"
          onClick={() => navigate('/signup')}
          disabled={isLoggedIn}
        >
          Sign Up
        </button>
        <button
          className="btn"
          onClick={() => navigate('/login')}
          disabled={isLoggedIn}
        >
          Log In
        </button>
        {isLoggedIn && <p className="info">You're already logged in!</p>}
      </div>
    </div>
  );
}

export default LandingPage;