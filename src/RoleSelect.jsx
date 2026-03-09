import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SPEAKERS } from './dataLoader';

const ROLES = [
    { id: 'haidar', name: SPEAKERS.p1.name, initial: 'H', color: 'var(--partner-prince)' },
    { id: 'azhura', name: SPEAKERS.p2.name, initial: 'A', color: 'var(--partner-princess)' },
];

export default function RoleSelect({ onSelect }) {
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
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                style={{ textAlign: 'center', marginBottom: 56 }}
            >
                {/* Wax seal emblem */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="wax-seal animate-gentle-bob"
                    style={{ margin: '0 auto 20px', fontSize: 18, width: 64, height: 64, letterSpacing: '-0.05em' }}
                >
                    hz
                </motion.div>

                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 64, fontWeight: 400,
                    fontStyle: 'italic',
                    margin: 0, letterSpacing: '-0.01em',
                    color: 'var(--text-color)',
                }}>
                    haizur
                </h1>
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14, fontWeight: 400,
                    letterSpacing: '0.25em',
                    color: 'var(--main-color)', marginTop: 10,
                    textTransform: 'uppercase',
                }}>
                    archives
                </div>
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                style={{
                    fontFamily: 'var(--font-handwritten)',
                    fontSize: 24, color: 'var(--text-dim)',
                    marginBottom: 36,
                    transform: 'rotate(-1.5deg)',
                }}
            >
                who are you?
            </motion.p>

            <div style={{
                display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center',
            }}>
                {ROLES.map((role, i) => (
                    <motion.button
                        key={role.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0 + i * 0.15 }}
                        whileHover={{ y: -10, rotate: 0, boxShadow: '0 12px 32px rgba(212, 160, 84, 0.25)' }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onSelect(role.id)}
                        className="tape-top"
                        style={{
                            width: 220,
                            padding: '40px 24px 16px',
                            background: 'var(--bg-card)',
                            border: '8px solid var(--bg-card)',
                            borderBottomWidth: 36,
                            cursor: 'pointer',
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 16,
                            boxShadow: '0 4px 16px var(--shadow-color), 0 2px 4px rgba(0,0,0,0.12)',
                            transform: i === 0 ? 'rotate(-4deg)' : 'rotate(3deg)',
                            position: 'relative',
                        }}
                    >
                        {/* Wax seal initial */}
                        <div className="wax-seal" style={{
                            width: 56, height: 56,
                            fontSize: 22,
                        }}>
                            {role.initial}
                        </div>
                        <span style={{
                            fontFamily: 'var(--font-handwritten)', fontWeight: 700,
                            fontSize: 22, color: 'var(--text-on-card)',
                        }}>
                            {role.name}
                        </span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
