import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';
import ThemeToggle from './ThemeToggle';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); // clear the auth token
    localStorage.removeItem('activeGameId'); // clear the active gameId
    window.location.href = '/';
  };

  const isLoggedIn = !!localStorage.getItem('token'); // confirms the user is logged in
  const activeGameId = localStorage.getItem('activeGameId'); // check if the user has an active game

  return (
    <nav className="navbar">
      <div className="navbar-brand" role="navigation" aria-label="Main navigation">
        <Link to="/">Battleship</Link>
        <ThemeToggle />
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle navigation menu">
          ☰
        </button>
      </div>
      <div className={`navbar-links ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Home
        </Link>
        {isLoggedIn && (
            <>
                <Link
                    to="/profile"
                    className={location.pathname === '/profile' ? 'active' : ''}
                    >
                    Profile
                </Link>
                <Link
                    to="/create-game"
                    className={location.pathname === '/create-game' ? 'active' : ''}>
                    Create Game
                </Link>
                <Link
                    to="/browse-games"
                    className={location.pathname === '/browse-games' ? 'active' : ''}
                    >
                    Browse Games
                </Link>
            </>
        )}
        {activeGameId && (
          <Link
              to={`/game/${activeGameId}`}
              className={location.pathname === `/game/${activeGameId}` ? 'active' : ''}
              title="Go to your active game"
            >
              🎮 Active Game
        </Link>
        )}
        {isLoggedIn ? (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <Link
            to="/login"
            className={location.pathname === '/login' ? 'active' : ''}
            >
            Login
        </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
