import React from 'react';
import '../styles/ConfirmModal.css';

function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isDangerous = false }) {
  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal">
        <div className="confirm-modal-header">
          <h2>{title}</h2>
        </div>
        
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        
        <div className="confirm-modal-actions">
          <button 
            className="btn-modal-cancel" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`btn-modal-confirm ${isDangerous ? 'dangerous' : ''}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
