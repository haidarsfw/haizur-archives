import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { motion } from 'framer-motion'
import './index.css'
import App from './App.jsx'
import RoleSelect from './RoleSelect.jsx'

const ROLE_KEY = 'ours-role';
const AUTH_KEY = 'ours-auth';
const CORRECT_PASSWORD = '250925';

function PasswordGate({ role, onSuccess, onBack }) {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const cleaned = input.replace(/[^0-9]/g, '');
        if (cleaned === CORRECT_PASSWORD) {
            localStorage.setItem(AUTH_KEY, 'true');
            onSuccess();
        } else {
            setError(true);
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: '100dvh', padding: 24,
            background: 'var(--bg-color)',
            fontFamily: 'var(--font-body)',
        }}>
            <div className="grain-overlay" />
            <div className="paper-fibers" />

            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ textAlign: 'center', maxWidth: 400 }}
            >
                {/* Lock icon */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    style={{
                        fontSize: 48, marginBottom: 24,
                        filter: 'drop-shadow(0 2px 8px rgba(212, 160, 84, 0.3))',
                    }}
                >
                    🔒
                </motion.div>

                <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 32, fontWeight: 400,
                    fontStyle: 'italic',
                    color: 'var(--text-color)',
                    margin: '0 0 12px',
                }}>
                    What's our date?
                </h2>

                <p style={{
                    fontFamily: 'var(--font-handwritten)',
                    fontSize: 18, color: 'var(--text-dim)',
                    margin: '0 0 32px',
                    lineHeight: 1.6,
                    transform: 'rotate(-0.5deg)',
                }}>
                    hint: waktu itu lagi call discord, seharian full, nonton alice in borderland
                </p>

                <form onSubmit={handleSubmit} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 16,
                }}>
                    <motion.input
                        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        type="text"
                        inputMode="numeric"
                        placeholder="dd-mm-yy"
                        maxLength={8}
                        value={input}
                        onChange={e => { setInput(e.target.value); setError(false); }}
                        autoFocus
                        style={{
                            width: '100%', maxWidth: 240,
                            padding: '14px 20px',
                            textAlign: 'center',
                            fontSize: 24, fontWeight: 600,
                            letterSpacing: '0.15em',
                            fontFamily: 'var(--font-mono)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-on-card)',
                            border: `2px solid ${error ? 'var(--error-color)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--radius-card)',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                    />

                    <button
                        type="submit"
                        style={{
                            padding: '14px 48px',
                            background: 'var(--main-color)',
                            color: 'var(--bg-color)',
                            border: 'none',
                            borderRadius: 'var(--radius-card)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                            fontSize: 16, fontWeight: 600,
                            boxShadow: '0 4px 16px rgba(212, 160, 84, 0.3)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 160, 84, 0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(212, 160, 84, 0.3)'; }}
                    >
                        Enter
                    </button>
                </form>

                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            color: 'var(--error-color)',
                            fontFamily: 'var(--font-handwritten)',
                            fontSize: 16, marginTop: 16,
                        }}
                    >
                        That's not it... try again
                    </motion.p>
                )}

                <button
                    onClick={onBack}
                    style={{
                        marginTop: 24,
                        background: 'none', border: 'none',
                        color: 'var(--sub-color)',
                        fontFamily: 'var(--font-handwritten)',
                        fontSize: 14, cursor: 'pointer',
                        borderBottom: '1px dashed var(--sub-color)',
                    }}
                >
                    switch role
                </button>
            </motion.div>
        </div>
    );
}

function RoleGate() {
    const [role, setRole] = useState(() => localStorage.getItem(ROLE_KEY));
    const [authenticated, setAuthenticated] = useState(() => localStorage.getItem(AUTH_KEY) === 'true');

    const handleSelect = (selectedRole) => {
        localStorage.setItem(ROLE_KEY, selectedRole);
        setRole(selectedRole);
    };

    const handleSwitchRole = () => {
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(AUTH_KEY);
        setRole(null);
        setAuthenticated(false);
    };

    if (!role) {
        return <RoleSelect onSelect={handleSelect} />;
    }

    if (!authenticated) {
        return (
            <PasswordGate
                role={role}
                onSuccess={() => setAuthenticated(true)}
                onBack={handleSwitchRole}
            />
        );
    }

    return <App currentRole={role} onSwitchRole={handleSwitchRole} />;
}

// Error boundary for catching render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--bg-color, #1c1410)',
          color: 'var(--main-color, #d4a054)',
          fontFamily: "var(--font-display, 'DM Serif Display'), Georgia, serif",
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontStyle: 'italic' }}>Something went wrong</h1>
          <p style={{ color: 'var(--sub-color, #a89278)', fontSize: '14px', maxWidth: '300px', fontFamily: "var(--font-body, 'Outfit'), sans-serif" }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '14px 28px',
              background: 'var(--main-color, #d4a054)',
              color: 'var(--bg-color, #1c1410)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: "var(--font-body, 'Outfit'), sans-serif",
              fontSize: '16px'
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Try to render the app with error handling
try {
  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <ErrorBoundary>
        <RoleGate />
      </ErrorBoundary>
    );
  } else {
    console.error('Root element not found');
  }
} catch (error) {
  console.error('Fatal initialization error:', error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;background:#1c1410;color:#d4a054;font-family:'DM Serif Display',serif;padding:20px;text-align:center;">
        <h1 style="font-style:italic">Failed to load</h1>
        <p style="color:#a89278;font-size:14px;font-family:'Outfit',sans-serif">${error.message || 'Unknown error'}</p>
      </div>
    `;
  }
}
