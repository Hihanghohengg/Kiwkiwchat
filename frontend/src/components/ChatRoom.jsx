import React from 'react';
import TerminalLog from './TerminalLog';
import Toast from './Toast';
import DestroyModal from './DestroyModal';
import QRModal from './QRModal';

export default function ChatRoom({
  isSecure, status, isUrgent, timerDisplay, termLines, roomUrl, 
  linkRevealed, setLinkRevealed, copyToClipboard, copied,
  messages, messagesEndRef, input, setInput, sendMessage,
  toast, setToast, showDestroy, setShowDestroy, destroyRoom,
  showQR, setShowQR
}) {
  return (
    <div className="room-root">
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      {showDestroy && <DestroyModal onConfirm={destroyRoom} onCancel={() => setShowDestroy(false)} />}
      {showQR      && <QRModal url={roomUrl} onClose={() => setShowQR(false)} />}

      <div className="room-panel">
        <div className="room-header">
          <div className="header-left">
            <div className={`status-dot ${isSecure ? 'dot-secure' : 'dot-waiting'}`} />
            <div>
              <span className="header-title">KIWKIW</span>
              <span className="header-status">// {status}</span>
            </div>
          </div>

          <div className="header-right">
            <div className={`timer-badge ${isUrgent ? 'timer-urgent' : ''}`}>
              <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {timerDisplay}
            </div>
            <button className="btn-icon btn-icon-danger" title="Destroy room" onClick={() => setShowDestroy(true)}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="chat-area">
          {termLines.length > 0 && (
            <TerminalLog lines={termLines} />
          )}

          {!isSecure && (
            <div className="waiting-state">
              <div className="share-panel">
                <p className="share-label">// room_link (click-to-reveal)</p>
                <div className="share-input-row">
                  <div
                    className={`share-link ${linkRevealed ? 'revealed' : 'hidden-link'}`}
                    onClick={() => setLinkRevealed(!linkRevealed)}
                    title="Klik untuk tampilkan"
                  >
                    {roomUrl}
                  </div>
                  <button
                    className="btn-icon"
                    title="Salin link"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-cyber-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    )}
                  </button>
                  <button
                    className="btn-icon"
                    title="Tampilkan QR"
                    onClick={() => setShowQR(true)}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
                      <rect x="3" y="16" width="5" height="5"/>
                      <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                      <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/>
                    </svg>
                  </button>
                </div>
                <p className="share-hint">// encryption_key in #fragment — never touches server</p>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.self ? 'msg-self' : 'msg-peer'}`}>
              <div className={`msg-bubble ${m.self ? 'bubble-self' : 'bubble-peer'}`}>
                {m.text}
                {m.ts && (
                  <span className="msg-time">
                    {new Date(m.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          {isSecure && (
            <button className="btn-icon qr-shortcut" title="QR Code" onClick={() => setShowQR(true)}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/>
                <rect x="3" y="16" width="5" height="5"/>
                <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                <path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/>
              </svg>
            </button>
          )}
          <form className="input-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={!isSecure}
              placeholder={isSecure ? "> ketik pesan..." : "> menunggu koneksi aman..."}
              className="msg-input"
            />
            <button
              type="submit"
              disabled={!isSecure || !input.trim()}
              className="btn-send"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
