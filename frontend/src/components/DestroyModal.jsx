import React from 'react';

export default function DestroyModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-box border-red-500/20">
        <div className="modal-icon-wrap border-red-500/20 bg-red-500/10">
          <svg className="w-7 h-7 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>
        <h3 className="modal-title">DESTROY_ROOM?</h3>
        <p className="modal-desc">Semua pesan akan dihapus permanen dan room akan dimusnahkan.</p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>[ BATAL ]</button>
          <button className="btn-destroy" onClick={onConfirm}>[ HAPUS ]</button>
        </div>
      </div>
    </div>
  );
}
