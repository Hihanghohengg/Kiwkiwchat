import React from 'react';

export default function TerminalLog({ lines }) {
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
