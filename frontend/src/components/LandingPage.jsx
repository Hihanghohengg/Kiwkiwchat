import React from 'react';

export default function LandingPage({ createRoom, isCreating }) {
  return (
    <div className="landing-root">
      <div className="ambient-glow glow-left"  />
      <div className="ambient-glow glow-right" />

      <div className="landing-card">
        <div className="landing-icon-wrap">
          <svg className="landing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="landing-title">KIW<span className="title-accent">KIW</span></h1>
        <p className="landing-sub">// ephemeral_encrypted_p2p_chat.exe</p>

        <button className="btn-create" onClick={createRoom} disabled={isCreating} style={{ opacity: isCreating ? 0.5 : 1 }}>
          <span className="btn-create-text">{isCreating ? '[ GENERATING... ]' : '[ CREATE_SECURE_ROOM ]'}</span>
        </button>

        <div className="badge-row">
          <span className="badge">AES-GCM-256</span>
          <span className="badge">ML-KEM-768</span>
          <span className="badge">WEBRTC P2P</span>
        </div>

        <p className="landing-footer">// No message-content logs. No persistent chat database.</p>
      </div>
    </div>
  );
}
