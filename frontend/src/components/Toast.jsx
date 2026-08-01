import React, { useState, useEffect } from 'react';

export default function Toast({ message, type, onDone }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t  = setTimeout(() => setExiting(true), 2400);
    const t2 = setTimeout(() => onDone(),          2800);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [onDone]);

  const colors = {
    success: 'border-cyber-green/40 bg-cyber-green/10 text-cyber-green',
    error:   'border-red-500/40    bg-red-500/10    text-red-400',
    info:    'border-brand-primary/40 bg-brand-primary/10 text-brand-primary',
  };

  return (
    <div className={`toast ${colors[type] || colors.info} ${exiting ? 'toast-exit' : 'toast-enter'}`}>
      {message}
    </div>
  );
}
