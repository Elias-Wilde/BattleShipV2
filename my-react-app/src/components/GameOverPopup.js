import React from 'react';
import '../styles/GameOverPopup.css';

function GameOverPopup({ winner, isPlayerWinner, onClose }) {
  return (
    <div className="game-over-popup">
      <div className="popup-content">
        <h2>Game Over</h2>
        <p>
          {winner
            ? isPlayerWinner
              ? "Congratulations! You won the game!"
              : "You lost the game. Better luck next time!"
            : "It's a draw!"}
        </p>
        <div className="popup-actions">
          <button onClick={onClose}>Close Game</button>
        </div>
      </div>
    </div>
  );
}

export default GameOverPopup;
