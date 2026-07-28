import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateKey, importKey, encrypt, decrypt } from './crypto/encryption';
import { performPQUpgrade } from './crypto/pq_upgrade';

const WS_URL  = import.meta.env.VITE_WS_URL  || "ws://localhost:8000";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ROOM_TTL_SECONDS = 15 * 60; // 15 minutes

// FIX-10: Production-safe logging — hide stack traces from DevTools in prod
const IS_DEV = import.meta.env.DEV;
function secureLog(label, err) {
  if (IS_DEV) {
    console.error(label, err);
  } else {
    // In production, omit the error object to avoid leaking implementation details
    console.error(`[KiwKiw] ${label}`);
  }
}

// FIX-13: Maximum messages kept in sessionStorage to prevent storage bloat
const MAX_STORED_MESSAGES = 100;

/* ─── Helpers ──────────────────────────────────────────────────── */
function storageKey(id, suffix) { return `kiwkiw_${suffix}_${id}`; }

function loadMessages(roomId) {
  try {
    const raw = sessionStorage.getItem(storageKey(roomId, 'msgs'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMessages(roomId, msgs) {
  try {
    // FIX-13: Only keep the last MAX_STORED_MESSAGES to avoid storage bloat
    const toSave = msgs.slice(-MAX_STORED_MESSAGES);
    sessionStorage.setItem(storageKey(roomId, 'msgs'), JSON.stringify(toSave));
  } catch { /* storage full — silently ignore */ }
}

function clearRoomStorage(roomId) {
  sessionStorage.removeItem(storageKey(roomId, 'msgs'));
  sessionStorage.removeItem(storageKey(roomId, 'start'));
}

/* ─── Countdown Timer Hook ─────────────────────────────────────── */
function useCountdown(startTimestamp, running) {
  const calcRemaining = () => {
    if (!startTimestamp) return ROOM_TTL_SECONDS;
    const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
    return Math.max(0, ROOM_TTL_SECONDS - elapsed);
  };

  const [seconds, setSeconds] = useState(calcRemaining);
  const interval = useRef(null);

  useEffect(() => {
    if (!running || !startTimestamp) return;
    setSeconds(calcRemaining());
    interval.current = setInterval(() => setSeconds(calcRemaining()), 1000);
    return () => clearInterval(interval.current);
  }, [running, startTimestamp]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, seconds };
}

/* ─── Terminal Log Line ─────────────────────────────────────────── */
function TerminalLog({ lines }) {
  return (
    <div className="terminal-log">
      {lines.map((l, i) => (
        <div key={i} className={`terminal-line ${l.ok ? 'ok' : ''}`}>
          <span className="terminal-ts">[{l.ts}]</span>
          {l.ok && <span className="terminal-badge"> [OK]</span>}
          {!l.ok && <span className="terminal-sep"> //</span>}
          <span className="terminal-msg"> {l.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Toast Notification ───────────────────────────────────────── */
function Toast({ message, type, onDone }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t  = setTimeout(() => setExiting(true), 2400);
    const t2 = setTimeout(() => onDone(),          2800);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []); // FIX: empty dependency array prevents infinite reset on parent re-render

  const colors = {
    success: 'border-cyber-green/40 bg-cyber-green/10 text-cyber-green',
    error:   'border-red-500/40    bg-red-500/10    text-red-400',
    info:    'border-brand-primary/40 bg-brand-primary/10 text-brand-primary',
  };

  return (
    <div className={`toast ${colors[type]} ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      {message}
    </div>
  );
}

/* ─── QR Modal ──────────────────────────────────────────────────── */
function QRModal({ url, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={e => e.stopPropagation()}>
        <p className="qr-label">// SCAN_TO_JOIN</p>
        <div className="qr-wrapper">
          <QRCodeSVG
            value={url}
            size={220}
            bgColor="#0a0c14"
            fgColor="#00ff88"
            level="M"
          />
        </div>
        <button className="qr-close-btn" onClick={onClose}>[ CLOSE ]</button>
      </div>
    </div>
  );
}

/* ─── Destroy Confirm Modal ─────────────────────────────────────── */
function DestroyModal({ onConfirm, onCancel }) {
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

/* ─── Main App ─────────────────────────────────────────────────── */
function App() {
  const [roomId,            setRoomId]            = useState(null);
  const [inRoom,            setInRoom]            = useState(false);
  const [roomStartTs,       setRoomStartTs]       = useState(null);
  const [status,            setStatus]            = useState("Disconnected");
  const [messages,          setMessages]          = useState([]);
  const [input,             setInput]             = useState("");
  const [isSecure,          setIsSecure]          = useState(false);
  const [linkRevealed,      setLinkRevealed]      = useState(false);
  const [copied,            setCopied]            = useState(false);
  const [toast,             setToast]             = useState(null);
  const [showDestroy,       setShowDestroy]       = useState(false);
  const [showQR,            setShowQR]            = useState(false);
  const [termLines,         setTermLines]         = useState([]);
  const [roomEnded,         setRoomEnded]         = useState(false);  // peer left → room destroyed
  const [roomFull,          setRoomFull]          = useState(false);  // tried to join but room is full
  const [isCreating,        setIsCreating]        = useState(false);  // prevent double clicks

  const ws             = useRef(null);
  const peer           = useRef(null);
  const dataChannel    = useRef(null);
  const classicalKey   = useRef(null);
  const hybridKey      = useRef(null);
  const isInitiator    = useRef(false);
  const currentRoomId  = useRef(null);
  const messagesEndRef = useRef(null);
  // FIX-11: store ICE servers from server response (may include TURN)
  const iceServers     = useRef([{ urls: "stun:stun.l.google.com:19302" }]);
  // FIX-08: store ws_token from POST /rooms
  const wsToken        = useRef("");

  const { display: timerDisplay, seconds: timerSeconds } = useCountdown(roomStartTs, inRoom);

  const showToast = (message, type = 'info') =>
    setToast({ message, type, id: Date.now() });

  const addTermLine = (msg, ok = false) => {
    const now = new Date();
    const ts  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;
    setTermLines(prev => [...prev, { ts, msg, ok }]);
  };

  /* Persist messages whenever they change */
  useEffect(() => {
    if (currentRoomId.current && messages.length > 0) {
      saveMessages(currentRoomId.current, messages);
    }
  }, [messages]);

  /* Scroll to bottom on new message */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Auto-destroy when timer hits 0 */
  useEffect(() => {
    if (inRoom && timerSeconds === 0) {
      showToast("Room TTL expired. Destroying...", "error");
      setTimeout(() => { window.location.href = '/'; }, 2800);
    }
  }, [timerSeconds, inRoom]);

  /* FIX-13: Clear sessionStorage when the user closes/navigates away */
  useEffect(() => {
    const handleUnload = () => {
      if (currentRoomId.current) clearRoomStorage(currentRoomId.current);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  /* ── Restore from URL on load ─── */
  useEffect(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;

    if (path.startsWith('/rooms/') && hash) {
      const id     = path.split('/rooms/')[1];
      const keyB64 = hash.substring(1);

      const sk = storageKey(id, 'start');
      let ts   = parseInt(sessionStorage.getItem(sk), 10);
      if (!ts || isNaN(ts)) {
        ts = Date.now();
        sessionStorage.setItem(sk, ts);
      }

      const elapsed = Math.floor((Date.now() - ts) / 1000);
      if (elapsed >= ROOM_TTL_SECONDS) {
        setStatus("Room expired.");
        clearRoomStorage(id);
        return;
      }

      // Restore persisted messages
      const savedMsgs = loadMessages(id);
      if (savedMsgs.length > 0) setMessages(savedMsgs);

      currentRoomId.current = id;
      setRoomStartTs(ts);
      setRoomId(id);

      importKey(keyB64)
        .then(key => {
          classicalKey.current = key;
          // Note: when restoring from URL (second peer joining via link),
          // ws_token is not available. The second peer must connect without token
          // OR the token should be embedded in the URL (handled by initiator).
          connectToRoom(id, wsToken.current);
        })
        .catch(err => {
          secureLog("Invalid room key", err);  // FIX-10
          setStatus("Invalid Room Key");
        });
    }
  }, []);

  /* ── Create Room ─── */
  const createRoom = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      setStatus("Generating secure room identity...");
      addTermLine("INITIALIZING_QUANTUM_SAFE_PARAMETERS...");
      // Delay for 3-5 seconds to prevent rate limit spam and improve UX
      const delayMs = Math.floor(Math.random() * (5000 - 3000 + 1) + 3000);
      await new Promise(r => setTimeout(r, delayMs));

      const response = await fetch(`${API_URL}/rooms`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data   = await response.json();
      const keyB64 = await generateKey();

      // FIX-08: store ws_token from server for WebSocket authentication
      wsToken.current = data.ws_token || "";

      // FIX-11: store ICE servers (may include TURN) from server response
      if (data.turn_servers && data.turn_servers.length > 0) {
        iceServers.current = data.turn_servers;
      }

      window.history.pushState({}, '', `/rooms/${data.room_id}#${keyB64}`);

      const ts = Date.now();
      sessionStorage.setItem(storageKey(data.room_id, 'start'), ts);
      setRoomStartTs(ts);
      setRoomId(data.room_id);
      currentRoomId.current = data.room_id;

      classicalKey.current = await importKey(keyB64);
      connectToRoom(data.room_id, data.ws_token);
    } catch (err) {
      secureLog("Failed to create room", err);  // FIX-10
      setStatus("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  /* ── Connect WebSocket ─── */
  // FIX-08: accept optional token for WebSocket authentication
  const connectToRoom = (id, token = "") => {
    if (ws.current) return;
    setInRoom(true);
    setStatus("Connecting to server...");
    addTermLine("GENERATING_EPHEMERAL_IDENTITY_KEYS...");

    // Append token as query param so server can authenticate the connection
    const wsUrl = token
      ? `${WS_URL}/rooms/${id}/ws?token=${encodeURIComponent(token)}`
      : `${WS_URL}/rooms/${id}/ws`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      addTermLine("ESTABLISHING_SIGNALING_CHANNEL...");
      setStatus("Waiting for peer...");
      addTermLine("WAITING_FOR_REMOTE_PEER...", true);
    };

    ws.current.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'error') {
        secureLog("Server rejected connection:", msg.reason);
        setStatus(`Error: ${msg.reason}`);
        addTermLine(`SERVER_ERROR :: ${msg.reason}`, false);
      } else if (msg.type === 'init') {
        isInitiator.current = msg.initiator;
        addTermLine(`IDENTITY_ASSIGNED :: initiator=${msg.initiator}`);
      } else if (msg.type === 'peer_ready') {
        addTermLine("REMOTE_PEER_DETECTED — INITIATING_HANDSHAKE...");
        setStatus("Peer joined. Initiating WebRTC...");
        // Whoever receives peer_ready is always the initiator for THIS negotiation.
        // This handles reconnects: if A refreshes, B (already in room) gets peer_ready
        // and correctly takes the initiator role.
        isInitiator.current = true;
        // Clean up any stale peer connection before starting fresh
        if (peer.current) {
          peer.current.close();
          peer.current = null;
          dataChannel.current = null;
        }
        initWebRTC();
      } else if (msg.type === 'signal') {
        handleSignal(msg.data);
      } else if (msg.type === 'room_ended') {
        // Peer left → room destroyed by server. Show ended screen then redirect.
        addTermLine("ROOM_TERMINATED — PEER_DISCONNECTED.", false);
        setIsSecure(false);
        setRoomEnded(true);
        if (currentRoomId.current) clearRoomStorage(currentRoomId.current);
        // Auto-redirect after 5 seconds so user can read the message
        setTimeout(() => { window.location.href = '/'; }, 5000);
      } else if (msg.type === 'room_full') {
        // Server rejected this connection: room already has 2 people
        setRoomFull(true);
        setInRoom(false);
      } else if (msg.type === 'peer_left') {
        // Legacy fallback — kept for safety
        addTermLine("REMOTE_PEER_DISCONNECTED.", false);
        setStatus("Peer disconnected.");
        setIsSecure(false);
      }
    };

    ws.current.onerror = (err) => {
      secureLog("WebSocket Error", err);
      setStatus("Connection error");
    };

    ws.current.onclose = (e) => {
      secureLog(`WebSocket Closed: code=${e.code} reason=${e.reason}`);
      setStatus("Disconnected from server");
      setIsSecure(false);
    };
  };

  /* ── Destroy Room ─── */
  const destroyRoom = useCallback(() => {
    setShowDestroy(false);
    if (currentRoomId.current) clearRoomStorage(currentRoomId.current);
    showToast("Room berhasil dihancurkan.", "success");
    setTimeout(() => { window.location.href = '/'; }, 2800);
  }, []);

  /* ── WebRTC ─── */
  const initWebRTC = async () => {
    // FIX-11: use ICE servers from server (may include TURN for symmetric NAT)
    peer.current = new RTCPeerConnection({
      iceServers: iceServers.current
    });

    peer.current.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current.send(JSON.stringify({ type: "signal", data: { candidate: event.candidate } }));
      }
    };

    // Always set up ondatachannel as fallback for the non-initiator path.
    // The peer that calls initWebRTC() from peer_ready is always initiator.
    peer.current.ondatachannel = (event) => {
      dataChannel.current = event.channel;
      setupDataChannel();
    };

    if (isInitiator.current) {
      dataChannel.current = peer.current.createDataChannel("secure-chat");
      setupDataChannel();
      const offer = await peer.current.createOffer();
      await peer.current.setLocalDescription(offer);
      ws.current.send(JSON.stringify({ type: "signal", data: { offer } }));
    }
  };

  const handleSignal = async (data) => {
    // Non-initiator: create peer connection if not yet created when offer arrives
    if (!peer.current) {
      isInitiator.current = false;
      // FIX-11: use ICE servers from server response
      peer.current = new RTCPeerConnection({
        iceServers: iceServers.current
      });
      peer.current.onicecandidate = (event) => {
        if (event.candidate) {
          ws.current.send(JSON.stringify({ type: "signal", data: { candidate: event.candidate } }));
        }
      };
      peer.current.ondatachannel = (event) => {
        dataChannel.current = event.channel;
        setupDataChannel();
      };
    }

    if (data.offer) {
      await peer.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peer.current.createAnswer();
      await peer.current.setLocalDescription(answer);
      ws.current.send(JSON.stringify({ type: "signal", data: { answer } }));
    } else if (data.answer) {
      await peer.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
      if (peer.current.remoteDescription) {
        await peer.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    }
  };

  const setupDataChannel = () => {
    dataChannel.current.onopen = async () => {
      setStatus("WebRTC Connected. Upgrading encryption...");
      addTermLine("WEBRTC_DATACHANNEL_OPEN...");

      const originalSend = dataChannel.current.send.bind(dataChannel.current);
      const wrappedPeer  = { send: originalSend, _pqHandler: null };

      dataChannel.current.onmessage = async (event) => {
        if (wrappedPeer._pqHandler) {
          const handled = await wrappedPeer._pqHandler(event.data);
          if (handled) return;
        }
        try {
          const decrypted = await decrypt(event.data, hybridKey.current);
          setMessages(prev => {
            const next = [...prev, { text: decrypted, self: false, ts: Date.now() }];
            if (currentRoomId.current) saveMessages(currentRoomId.current, next);
            return next;
          });
        } catch (err) {
          secureLog("Decryption failed", err);  // FIX-10
        }
      };

      try {
        hybridKey.current = await performPQUpgrade(
          wrappedPeer,
          classicalKey.current,
          isInitiator.current,
          (prog) => { setStatus(prog); addTermLine(prog.toUpperCase().replace(/ /g, '_')); }
        );
        setIsSecure(true);
        setStatus("Secure P2P Channel Active");
        addTermLine("E2E_ENCRYPTED_CHANNEL_ESTABLISHED :: AES-256+ML-KEM-768", true);
      } catch (err) {
        setStatus("PQ Upgrade Failed");
        addTermLine("PQ_UPGRADE_FAILED.", false);
        secureLog("PQ upgrade failed", err);  // FIX-10
      }
    };
  };

  /* ── Clipboard ─── */
  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast("Link disalin!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Send Message ─── */
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !isSecure) return;
    try {
      const ciphertext = await encrypt(input, hybridKey.current);
      dataChannel.current.send(ciphertext);
      setMessages(prev => {
        const next = [...prev, { text: input, self: true, ts: Date.now() }];
        if (currentRoomId.current) saveMessages(currentRoomId.current, next);
        return next;
      });
      setInput("");
    } catch (err) {
      secureLog("Failed to encrypt message", err);  // FIX-10
    }
  };

  /* ─── Room Full Screen ────────────────────────────────────────── */
  if (roomFull) {
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

  /* ─── Room Ended Screen ────────────────────────────────────────── */
  if (roomEnded) {
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
          <p className="ended-desc">Salah satu peserta meninggalkan room. Sesi ini telah berakhir dan semua pesan telah dihapus.</p>
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

  /* ─── Landing Page ─────────────────────────────────────────────── */
  if (!inRoom) {

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

          <p className="landing-footer">// no logs. no history. no traces.</p>
        </div>
      </div>
    );
  }

  /* ─── Room Chat Page ────────────────────────────────────────────── */
  const isUrgent = timerSeconds <= 120;
  const roomUrl  = window.location.href;

  return (
    <div className="room-root">

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      {showDestroy && <DestroyModal onConfirm={destroyRoom} onCancel={() => setShowDestroy(false)} />}
      {showQR      && <QRModal url={roomUrl} onClose={() => setShowQR(false)} />}

      <div className="room-panel">

        {/* ── Header ── */}
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

        {/* ── Chat Area ── */}
        <div className="chat-area">

          {/* Terminal log — always shown at top if there are lines */}
          {termLines.length > 0 && (
            <TerminalLog lines={termLines} />
          )}

          {/* Waiting state (no secure channel yet) */}
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

          {/* Messages */}
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

        {/* ── Input Area ── */}
        <div className="input-area">
          {/* QR icon shortcut when secure */}
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

export default App;
