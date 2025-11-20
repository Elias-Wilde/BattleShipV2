import React from 'react';
import Cell from './Cell';
import '../styles//Board.css';

function Board({ boardState, isPlayerBoard, previewCoordinates = [], onPreviewPlacement, onPlaceShip, onAttack, isTurn }) {
  const handleCellClick = (row, col) => {
    if (isPlayerBoard && onPreviewPlacement) {
      onPreviewPlacement([row, col]);
    } else if (!isPlayerBoard && isTurn && onAttack) {
      onAttack([row, col]);
    }
  };

  return (
    <div className={`board ${isPlayerBoard ? 'player-board' : 'opponent-board'}`}>
      {boardState.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((cell, colIndex) => {
            const isPreview = previewCoordinates.some(([r, c]) => r === rowIndex && c === colIndex);
            return (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                status={isPreview ? 'P' : cell}
                className={
                  cell === 'H'
                  ? 'hit'
                  : cell === 'M'
                  ? 'miss'
                  : isPreview
                  ? 'preview'
                  : ''
                }
                onClick={() => handleCellClick(rowIndex, colIndex)}
              />
            );
      })}
        </div>
      ))}
      {isPlayerBoard && onPlaceShip && (
        <button onClick={onPlaceShip} disabled={previewCoordinates.length === 0}>
          Place Ship
        </button>
      )}
    </div>
  );
}

export default Board;
