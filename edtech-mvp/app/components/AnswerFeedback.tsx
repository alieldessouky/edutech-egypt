/**
 * Answer Feedback Component
 *
 * Displays animated feedback for correct/wrong answers
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AnswerFeedbackProps {
    show: boolean;
    isCorrect: boolean;
    points?: number;
}

export default function AnswerFeedback({
    show,
    isCorrect,
    points
}: AnswerFeedbackProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.3, type: 'spring' }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '2rem',
                        backgroundColor: isCorrect ? '#d4edda' : '#f8d7da',
                        border: `2px solid ${isCorrect ? '#28a745' : '#dc3545'}`,
                        color: isCorrect ? '#155724' : '#721c24',
                        fontWeight: '600',
                        fontSize: '1rem',
                        marginTop: '1rem',
                        boxShadow: `0 4px 12px ${isCorrect ? 'rgba(40, 167, 69, 0.3)' : 'rgba(220, 53, 69, 0.3)'}`
                    }}
                >
                    {/* Icon with animation */}
                    <motion.span
                        initial={{ rotate: -180 }}
                        animate={{ rotate: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ fontSize: '1.5rem' }}
                    >
                        {isCorrect ? '✓' : '✗'}
                    </motion.span>

                    {/* Text */}
                    <span style={{ direction: 'rtl' }}>
                        {isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
                    </span>

                    {/* Points (if correct) */}
                    {isCorrect && points !== undefined && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            style={{
                                backgroundColor: '#FFD700',
                                color: '#333',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '1rem',
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                marginRight: '0.5rem'
                            }}
                        >
                            +{points}
                        </motion.span>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Floating Points Animation
 *
 * Shows floating "+points" animation when answer is correct
 */
export function FloatingPoints({ points, show }: { points: number; show: boolean }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ y: 0, opacity: 1, scale: 1 }}
                    animate={{ y: -50, opacity: 0, scale: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{
                        position: 'absolute',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#FFD700',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        pointerEvents: 'none'
                    }}
                >
                    +{points}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
