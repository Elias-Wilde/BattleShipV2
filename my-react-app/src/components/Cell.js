import React from 'react';
import '../styles/Cell.css';

function Cell({ status, onClick }) {
  return (
    <div className={`cell ${status}`} onClick={onClick}></div>
  );
}

export default Cell;
