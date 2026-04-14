import React from "react";
import { formatLastSeen } from "./hooks/usePresence";

export default function PartnerStatus({ partnerPresence, currentRole }) {
  if (!partnerPresence) return null;

  const isOnline = partnerPresence.online;
  const isPrincess = currentRole === 'haidar'; // If I am haidar, partner is princess
  const partnerName = isPrincess ? "Princess" : "My Prince";
  
  const lastSeenStr = formatLastSeen(partnerPresence);
  
  const formatTimeInfo = (ts) => {
    if (!ts) return "Unknown";
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        padding: '12px 18px',
        borderRadius: 'var(--radius-card)',
        boxShadow: '0 4px 12px var(--shadow-color)',
        transform: 'rotate(-1deg)',
        fontFamily: 'var(--font-body)',
        minWidth: 200,
    }}>
      {/* Tape strip at top */}
      <div style={{
        position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%) rotate(1deg)',
        width: 40, height: 10,
        background: 'var(--tape-color, rgba(212, 160, 84, 0.5))',
        borderRadius: 1, opacity: 0.8,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ position: 'relative', width: 10, height: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: isOnline ? 'var(--success-color)' : 'var(--sub-color)',
          }} />
          {isOnline && (
              <div className="animate-pulse" style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                background: 'var(--success-color)', opacity: 0.4,
              }} />
          )}
        </div>
        <span style={{
          fontSize: 16, fontWeight: 600, color: 'var(--text-on-card)',
          fontFamily: 'var(--font-handwritten)',
        }}>
          {partnerName}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-dim-card)', fontFamily: 'var(--font-mono)' }}>Status</span>
            <span style={{ color: isOnline ? 'var(--success-color)' : 'var(--text-color)', fontWeight: 500 }}>
                {isOnline ? "Online Now" : lastSeenStr || "Offline"}
            </span>
         </div>
         
         {!isOnline && partnerPresence.lastSeen && (
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-dim-card)', fontFamily: 'var(--font-mono)' }}>Last Seen</span>
                <span style={{ color: 'var(--text-dim-card)' }}>{formatTimeInfo(partnerPresence.lastSeen)}</span>
             </div>
         )}

         {partnerPresence.lastLogin && (
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2, paddingTop: 4, borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ color: 'var(--text-dim-card)', fontFamily: 'var(--font-mono)' }}>Last Login</span>
                <span style={{ color: 'var(--text-dim-card)' }}>{formatTimeInfo(partnerPresence.lastLogin)}</span>
             </div>
         )}
      </div>
    </div>
  );
}
