/**
 * Level Up Toast Notification
 *
 * Displays animated notification when student levels up
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LevelUpToastProps {
    show: boolean;
    oldLevel: number;
    newLevel: number;
    onClose: () => void;
}

export default function LevelUpToast({
    show,
    oldLevel,
    newLevel,
    onClose
}: LevelUpToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300); // Wait for exit animation
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        top: '2rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        maxWidth: '400px',
                        width: '90%'
                    }}
                >
                    <div
                        style={{
                            backgroundColor: '#FFD700',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            boxShadow: '0 10px 40px rgba(255, 215, 0, 0.5)',
                            textAlign: 'center',
                            border: '3px solid #FFA500',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Sparkle effect */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                                animation: 'shimmer 2s infinite'
                            }}
                        />

                        {/* Content */}
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
                                style={{ fontSize: '3rem', marginBottom: '0.5rem' }}
                            >
                                🎉
                            </motion.div>

                            <div
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    color: '#333',
                                    marginBottom: '0.5rem',
                                    direction: 'rtl'
                                }}
                            >
                                ترقية للمستوى!
                            </div>

                            <div
                                style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '600',
                                    color: '#666',
                                    direction: 'rtl'
                                }}
                            >
                                المستوى {oldLevel} → المستوى {newLevel}
                            </div>

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ delay: 0.5, duration: 0.6 }}
                                style={{
                                    marginTop: '1rem',
                                    fontSize: '2.5rem'
                                }}
                            >
                                🏆
                            </motion.div>
                        </div>

                        {/* Fireworks */}
                        <div style={{
                            position: 'absolute',
                            top: '20%',
                            left: '10%',
                            fontSize: '1.5rem',
                            animation: 'sparkle 1s ease-in-out infinite'
                        }}>
                            ✨
                        </div>
                        <div style={{
                            position: 'absolute',
                            top: '15%',
                            right: '15%',
                            fontSize: '1.25rem',
                            animation: 'sparkle 1s ease-in-out infinite 0.3s'
                        }}>
                            ⭐
                        </div>
                        <div style={{
                            position: 'absolute',
                            bottom: '25%',
                            left: '20%',
                            fontSize: '1rem',
                            animation: 'sparkle 1s ease-in-out infinite 0.6s'
                        }}>
                            💫
                        </div>
                    </div>

                    {/* Inline CSS for animations */}
                    <style>{`
                        @keyframes shimmer {
                            0% {
                                transform: translateX(-100%);
                            }
                            100% {
                                transform: translateX(100%);
                            }
                        }

                        @keyframes sparkle {
                            0%, 100% {
                                opacity: 0;
                                transform: scale(0.8);
                            }
                            50% {
                                opacity: 1;
                                transform: scale(1.2);
                            }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
