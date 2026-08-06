import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateKey, importKey, encrypt, decrypt } from './crypto/encryption';
import { performPQUpgrade } from './crypto/pq_upgrade';

import LandingPage from './components/LandingPage';
import ChatRoom from './components/ChatRoom';
import RoomEnded from './components/RoomEnded';
import RoomFull from './components/RoomFull';
import { useCountdown } from './hooks/useCountdown';
import { secureLog } from './utils/logger';
import { storageKey, loadMessages, saveMessages, clearRoomStorage } from './utils/storage';

const { hostname, port } = window.location;
const isDev = port === '5173' || port === '4173';

const defaultApiUrl = isDev ? `http://${hostname}:8000` : "https://kiwkiw-backend.onrender.com";
const defaultWsUrl  = isDev ? `ws://${hostname}:8000`   : "wss://kiwkiw-backend.onrender.com";

const WS_URL  = import.meta.env.VITE_WS_URL  || defaultWsUrl;
const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

const ROOM_TTL_SECONDS = import.meta.env.VITE_TEST_MODE 
  ? (parseInt(import.meta.env.VITE_ROOM_TTL_SECONDS) || 3) 
  : 15 * 60; // 15 minutes

export default function App() {
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
  const [roomEnded,         setRoomEnded]         = useState(false);  
  const [roomFull,          setRoomFull]          = useState(false);  
  const [isCreating,        setIsCreating]        = useState(false);  

  const ws             = useRef(null);
  const peer           = useRef(null);
  const dataChannel    = useRef(null);
  const classicalKey   = useRef(null);
  const hybridKey      = useRef(null);
  const isInitiator    = useRef(false);
  const currentRoomId  = useRef(null);
  const messagesEndRef = useRef(null);
  const iceServers     = useRef([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "turn:global.relay.metered.ca:80", username: "72d96f322f19adc9ad45e376", credential: "SGyfufycpKzu9PmP" },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "72d96f322f19adc9ad45e376", credential: "SGyfufycpKzu9PmP" },
    { urls: "turn:global.relay.metered.ca:443", username: "72d96f322f19adc9ad45e376", credential: "SGyfufycpKzu9PmP" },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "72d96f322f19adc9ad45e376", credential: "SGyfufycpKzu9PmP" }
  ]);
  const wsToken        = useRef("");
  const pendingCandidates = useRef([]);
  const sendCounter    = useRef(0);
  const receiveCounter = useRef(0);

  const { display: timerDisplay, seconds: timerSeconds } = useCountdown(roomStartTs, inRoom);

  const showToast = (message, type = 'info') => setToast({ message, type, id: Date.now() });

  const addTermLine = (msg, ok = false) => {
    const now = new Date();
    const ts  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`;
    setTermLines(prev => [...prev, { ts, msg, ok }]);
  };

  useEffect(() => {
    if (currentRoomId.current && messages.length > 0) saveMessages(currentRoomId.current, messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inRoom && timerSeconds === 0) {
      showToast("Room TTL expired. Destroying...", "error");
      if (currentRoomId.current) clearRoomStorage(currentRoomId.current);
      setTimeout(() => { window.location.href = '/'; }, 2800);
    }
  }, [timerSeconds, inRoom]);

  // Handle unload - DO NOT clear storage so refresh works
  useEffect(() => {
    const handleUnload = () => {
      if (ws.current) ws.current.close();
      if (peer.current) peer.current.close();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Restore from URL on load
  useEffect(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;

    if (path.startsWith('/rooms/') && hash) {
      const id = path.split('/rooms/')[1];
      const fragment = hash.substring(1);
      
      let inviteToken = "";
      let keyB64 = fragment;
      if (fragment.includes('|')) {
        const parts = fragment.split('|');
        inviteToken = parts[0];
        keyB64 = parts[1];
      }

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

      const savedMsgs = loadMessages(id);
      if (savedMsgs.length > 0) setMessages(savedMsgs);

      currentRoomId.current = id;
      setRoomStartTs(ts);
      setRoomId(id);

      const savedToken = sessionStorage.getItem(storageKey(id, 'token'));
      const tokenToUse = savedToken || inviteToken;

      importKey(keyB64)
        .then(key => {
          classicalKey.current = key;
          connectToRoom(id, tokenToUse);
        })
        .catch(err => {
          secureLog("Invalid room key", err);
          setStatus("Invalid Room Key");
        });
    }
  }, []);

  const createRoom = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      setStatus("Generating secure room identity...");
      addTermLine("INITIALIZING_QUANTUM_SAFE_PARAMETERS...");
      const delayMs = import.meta.env.VITE_TEST_MODE 
        ? 50 
        : Math.floor(Math.random() * (5000 - 3000 + 1) + 3000);
      await new Promise(r => setTimeout(r, delayMs));

      const response = await fetch(`${API_URL}/rooms`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const data   = await response.json();
      const keyB64 = await generateKey();

      wsToken.current = data.creator_token || "";
      sessionStorage.setItem(storageKey(data.room_id, 'token'), data.creator_token);

      if (data.turn_servers && data.turn_servers.length > 0) {
        iceServers.current = data.turn_servers;
      }

      window.history.pushState({}, '', `/rooms/${data.room_id}#${data.invite_token}|${keyB64}`);

      const ts = Date.now();
      sessionStorage.setItem(storageKey(data.room_id, 'start'), ts);
      setRoomStartTs(ts);
      setRoomId(data.room_id);
      currentRoomId.current = data.room_id;

      classicalKey.current = await importKey(keyB64);
      connectToRoom(data.room_id, data.creator_token);
    } catch (err) {
      secureLog("Failed to create room", err);
      setStatus("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const connectToRoom = (id, token = "") => {
    if (ws.current) return;
    setInRoom(true);
    setStatus("Connecting to server...");
    addTermLine("GENERATING_EPHEMERAL_IDENTITY_KEYS...");

    const wsUrl = token
      ? `${WS_URL}/rooms/${id}/ws?token=${encodeURIComponent(token)}`
      : `${WS_URL}/rooms/${id}/ws`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      addTermLine("ESTABLISHING_SIGNALING_CHANNEL...");
      setStatus("Waiting for peer...");
      addTermLine("WAITING_FOR_REMOTE_PEER...", true);

      ws.current.pingInterval = setInterval(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
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
        
        if (msg.turn_servers && msg.turn_servers.length > 0) {
          iceServers.current = msg.turn_servers;
        }

        if (msg.expires_in !== undefined) {
          const localStartTs = Date.now() - ((ROOM_TTL_SECONDS - msg.expires_in) * 1000);
          sessionStorage.setItem(storageKey(currentRoomId.current, 'start'), localStartTs);
          setRoomStartTs(localStartTs);
        }
      } else if (msg.type === 'peer_ready') {
        addTermLine("REMOTE_PEER_DETECTED — INITIATING_HANDSHAKE...");
        setStatus("Peer joined. Initiating WebRTC...");
        isInitiator.current = true;
        if (peer.current) {
          peer.current.close();
          peer.current = null;
          dataChannel.current = null;
        }

        const storedStart = parseInt(sessionStorage.getItem(storageKey(currentRoomId.current, 'start')), 10);
        if (storedStart && !isNaN(storedStart)) {
          ws.current.send(JSON.stringify({
            type: "signal",
            data: { startTs: storedStart }
          }));
        }

        initWebRTC();
      } else if (msg.type === 'signal') {
        handleSignal(msg.data);
      } else if (msg.type === 'peer_disconnected') {
        addTermLine("REMOTE_PEER_DISCONNECTED. Waiting for reconnect...", false);
        setStatus("Peer disconnected.");
        setIsSecure(false);
      } else if (msg.type === 'room_full') {
        setRoomFull(true);
        setInRoom(false);
      } else if (msg.type === 'room_ended') {
        addTermLine("ROOM_DESTROYED_BY_PEER", false);
        if (currentRoomId.current) clearRoomStorage(currentRoomId.current);
        setRoomEnded(true);
      } else if (msg.type === 'pong') {
        // Just ignore pong
      }
    };

    ws.current.onerror = (err) => {
      secureLog("WebSocket Error", err);
      setStatus("Connection error");
    };

    ws.current.onclose = (e) => {
      if (ws.current && ws.current.pingInterval) clearInterval(ws.current.pingInterval);
      secureLog(`WebSocket Closed: code=${e.code} reason=${e.reason}`);
      setStatus("Disconnected from server");
      setIsSecure(false);
    };
  };

  const destroyRoom = useCallback(() => {
    setShowDestroy(false);
    if (currentRoomId.current) clearRoomStorage(currentRoomId.current);
    
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "destroy_room" }));
    }
    
    if (ws.current) ws.current.close();
    if (peer.current) peer.current.close();
    
    setRoomEnded(true);
    showToast("Room berhasil dihancurkan.", "success");
    setTimeout(() => { window.location.href = '/'; }, 2800);
  }, []);

  const initWebRTC = async () => {
    peer.current = new RTCPeerConnection({ iceServers: iceServers.current });

    peer.current.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current.send(JSON.stringify({ type: "signal", data: { candidate: event.candidate } }));
      }
    };

    peer.current.oniceconnectionstatechange = () => {
      if (peer.current.iceConnectionState === 'failed') {
        setStatus("WebRTC Blocked (Requires TURN)");
        addTermLine("WEBRTC_FAILED :: Symmetric NAT traversal blocked. Please configure a TURN server.", false);
      }
    };

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
    try {
      if (data.startTs !== undefined) {
        const ts = parseInt(data.startTs, 10);
        if (!isNaN(ts)) {
          sessionStorage.setItem(storageKey(currentRoomId.current, 'start'), ts);
          setRoomStartTs(ts);
        }
      }

      if (!peer.current) {
        isInitiator.current = false;
        peer.current = new RTCPeerConnection({ iceServers: iceServers.current });
        peer.current.onicecandidate = (event) => {
          if (event.candidate) ws.current.send(JSON.stringify({ type: "signal", data: { candidate: event.candidate } }));
        };
        
        peer.current.oniceconnectionstatechange = () => {
          if (peer.current.iceConnectionState === 'failed') {
            setStatus("WebRTC Blocked (Requires TURN)");
            addTermLine("WEBRTC_FAILED :: Symmetric NAT traversal blocked. Please configure a TURN server.", false);
          }
        };

        peer.current.ondatachannel = (event) => {
          dataChannel.current = event.channel;
          setupDataChannel();
        };
      }

      if (data.offer) {
        await peer.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        while (pendingCandidates.current.length > 0) {
          await peer.current.addIceCandidate(new RTCIceCandidate(pendingCandidates.current.shift()));
        }
        const answer = await peer.current.createAnswer();
        await peer.current.setLocalDescription(answer);
        ws.current.send(JSON.stringify({ type: "signal", data: { answer } }));
      } else if (data.answer) {
        await peer.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        while (pendingCandidates.current.length > 0) {
          await peer.current.addIceCandidate(new RTCIceCandidate(pendingCandidates.current.shift()));
        }
      } else if (data.candidate) {
        if (peer.current.remoteDescription) {
          await peer.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          pendingCandidates.current.push(data.candidate);
        }
      }
    } catch (err) {
      secureLog("WebRTC Signal Error", err);
      addTermLine(`WEBRTC_ERROR :: ${err.message}`, false);
      setStatus("WebRTC Negotiation Failed");
    }
  };

  const setupDataChannel = () => {
    const originalSend = dataChannel.current.send.bind(dataChannel.current);
    const wrappedPeer  = { send: originalSend, _pqHandler: null };

    const handleOpen = async () => {
      performance.mark('datachannel_open');
      setStatus("WebRTC Connected. Upgrading encryption...");
      addTermLine("WEBRTC_DATACHANNEL_OPEN...");

      try {
        sendCounter.current = 0;
        receiveCounter.current = 0;
        performance.mark('pq_upgrade_started');
        hybridKey.current = await performPQUpgrade(
          wrappedPeer,
          classicalKey.current,
          isInitiator.current,
          (prog) => { setStatus(prog); addTermLine(prog.toUpperCase().replace(/ /g, '_')); },
          currentRoomId.current
        );
        performance.mark('pq_upgrade_completed');
        setIsSecure(true);
        performance.mark('secure_ui_ready');
        setStatus("Secure P2P Channel Active");
        addTermLine("E2E_ENCRYPTED_CHANNEL_ESTABLISHED :: AES-256+ML-KEM-768", true);
      } catch (err) {
        setStatus("PQ Upgrade Failed");
        addTermLine("PQ_UPGRADE_FAILED.", false);
        secureLog("PQ upgrade failed", err);
      }
    };

    dataChannel.current.onmessage = async (event) => {
      performance.mark('message_received_raw');
      if (wrappedPeer._pqHandler) {
        const handled = await wrappedPeer._pqHandler(event.data);
        if (handled) return;
      }
      try {
        const envelope = JSON.parse(event.data);
        if (envelope.type !== "chat") return;
        if (envelope.version !== 2) throw new Error("Unsupported protocol version");
        
        const expectedDir = isInitiator.current ? "responder-to-initiator" : "initiator-to-responder";
        if (envelope.direction !== expectedDir) throw new Error("Invalid direction");
        if (envelope.sequence !== receiveCounter.current) throw new Error("Invalid sequence / Replay detected");
        
        const decrypted = await decrypt(
          envelope.ciphertext, envelope.iv, hybridKey.current, 
          envelope.sequence, envelope.direction, envelope.version, currentRoomId.current
        );
        performance.mark('message_decrypted');
        
        receiveCounter.current++;

        setMessages(prev => {
          const next = [...prev, { text: decrypted, self: false, ts: Date.now() }];
          if (currentRoomId.current) saveMessages(currentRoomId.current, next);
          return next;
        });
      } catch (err) {
        secureLog("Decryption or validation failed", err);
      }
    };
    
    dataChannel.current.onclose = () => {
      secureLog("DataChannel closed");
      addTermLine("WEBRTC_DATACHANNEL_CLOSED.", false);
      setIsSecure(false);
    };

    dataChannel.current.onerror = (err) => {
      secureLog("DataChannel error", err);
      addTermLine("WEBRTC_DATACHANNEL_ERROR.", false);
      setIsSecure(false);
    };

    if (dataChannel.current.readyState === 'open') {
      handleOpen();
    } else {
      dataChannel.current.onopen = handleOpen;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast("Link disalin!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !isSecure || !dataChannel.current || dataChannel.current.readyState !== 'open') return;
    try {
      const seq = sendCounter.current;
      const dir = isInitiator.current ? "initiator-to-responder" : "responder-to-initiator";
      
      const { ciphertext, iv } = await encrypt(
        input, hybridKey.current, seq, dir, 2, currentRoomId.current
      );
      
      sendCounter.current++;
      
      const envelope = {
        type: "chat",
        version: 2,
        sequence: seq,
        direction: dir,
        iv: iv,
        ciphertext: ciphertext
      };
      
      performance.mark('message_sent');
      dataChannel.current.send(JSON.stringify(envelope));
      
      setMessages(prev => {
        const next = [...prev, { text: input, self: true, ts: Date.now() }];
        if (currentRoomId.current) saveMessages(currentRoomId.current, next);
        return next;
      });
      setInput("");
    } catch (err) {
      secureLog("Failed to encrypt message", err);
    }
  };

  if (roomFull) return <RoomFull />;
  if (roomEnded) return <RoomEnded />;
  if (!inRoom) return <LandingPage createRoom={createRoom} isCreating={isCreating} />;

  return (
    <ChatRoom
      roomId={roomId}
      isSecure={isSecure}
      status={status}
      isUrgent={timerSeconds <= 120}
      timerDisplay={timerDisplay}
      termLines={termLines}
      roomUrl={window.location.href}
      linkRevealed={linkRevealed}
      setLinkRevealed={setLinkRevealed}
      copyToClipboard={copyToClipboard}
      copied={copied}
      messages={messages}
      messagesEndRef={messagesEndRef}
      input={input}
      setInput={setInput}
      sendMessage={sendMessage}
      toast={toast}
      setToast={setToast}
      showDestroy={showDestroy}
      setShowDestroy={setShowDestroy}
      destroyRoom={destroyRoom}
      showQR={showQR}
      setShowQR={setShowQR}
    />
  );
}
