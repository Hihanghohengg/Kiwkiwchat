import React from 'react';

export default function RoomEnded() {
  return (
    <div className="landing-root">
      <div className="ambient-glow glow-left"  />
      <div className="ambient-glow glow-right" />
      <div className="landing-card ended-card">
        <div className="ended-icon-wrap border-amber-500/20 bg-amber-500/8">
          <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="ended-label text-amber-400">// SESSION_TERMINATED</p>
        <h2 className="ended-title">ROOM_ENDED</h2>
        <p className="ended-desc">Sesi ini telah berakhir dan semua pesan telah dihapus.</p>
        <div className="ended-terminal">
          <span className="terminal-ts">[{new Date().toTimeString().slice(0,8)}]</span>
          <span className="terminal-sep"> //</span>
          <span className="terminal-msg"> REDIRECTING_TO_HOME in 5s...</span>
        </div>
        <button className="btn-create" style={{marginTop:'1.5rem'}} onClick={() => { window.location.href = '/'; }}>
          <span className="btn-create-text">[ KEMBALI SEKARANG ]</span>
        </button>
      </div>
    </div>
  );
}
