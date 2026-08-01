import React from 'react';

export default function RoomFull() {
  return (
    <div className="landing-root">
      <div className="ambient-glow glow-left"  />
      <div className="ambient-glow glow-right" />
      <div className="landing-card ended-card">
        <div className="ended-icon-wrap border-red-500/20 bg-red-500/8">
          <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            <line x1="12" y1="15" x2="12" y2="17"/>
          </svg>
        </div>
        <p className="ended-label text-red-400">// ACCESS_DENIED</p>
        <h2 className="ended-title">ROOM_FULL</h2>
        <p className="ended-desc">Room ini sudah terisi 2 orang. Sesi ini bersifat privat dan tidak dapat dimasuki.</p>
        <div className="ended-terminal">
          <span className="terminal-ts">[{new Date().toTimeString().slice(0,8)}]</span>
          <span className="terminal-sep"> //</span>
          <span className="terminal-msg"> CONNECTION_REJECTED :: max_capacity=2</span>
        </div>
        <button className="btn-create" style={{marginTop:'1.5rem'}} onClick={() => { window.location.href = '/'; }}>
          <span className="btn-create-text">[ KEMBALI KE HOME ]</span>
        </button>
      </div>
    </div>
  );
}
