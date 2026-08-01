import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRModal({ url, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={e => e.stopPropagation()}>
        <p className="qr-label">// SCAN_TO_JOIN</p>
        <div className="qr-wrapper">
          <QRCodeSVG
            value={url}
            size={220}
            bgColor="#ffffff"
            fgColor="#4f46e5"
            level="M"
          />
        </div>
        <button className="qr-close-btn" onClick={onClose}>[ CLOSE ]</button>
      </div>
    </div>
  );
}
