export function storageKey(id, suffix) { return `kiwkiw_${suffix}_${id}`; }
const MAX_STORED_MESSAGES = 100;

export function loadMessages(roomId) {
  try {
    const raw = sessionStorage.getItem(storageKey(roomId, 'msgs'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveMessages(roomId, msgs) {
  try {
    const toSave = msgs.slice(-MAX_STORED_MESSAGES);
    sessionStorage.setItem(storageKey(roomId, 'msgs'), JSON.stringify(toSave));
  } catch { /* storage full — silently ignore */ }
}

export function clearRoomStorage(roomId) {
  sessionStorage.removeItem(storageKey(roomId, 'msgs'));
  sessionStorage.removeItem(storageKey(roomId, 'start'));
}
