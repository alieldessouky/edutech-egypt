/**
 * Quiz Progress Bar Component
 *
 * Displays quiz progress with smooth animations
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface QuizProgressBarProps {
    current: number;
    total: number;
    correctCount?: number;
}

export default function QuizProgressBar({ current, total, correctCount }: QuizProgressBarProps) {
    const percentage = (current / total) * 100;
    const correctPercentage = correctCount !== undefined ? (correctCount / total) * 100 : 0;

    return (
        <div
            style={{
                width: '100%',
                direction: 'rtl'
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    color: '#666'
                }}
            >
                <div style={{ fontWeight: '600', color: '#333' }}>
                    سؤال {current} من {total}
                </div>
                {correctCount !== undefined && (
                    <div style={{ color: '#28a745', fontWeight: '600' }}>
                        ✓ {correctCount} صحيحة
                    </div>
                )}
            </div>

            {/* Progress bar container */}
            <div
                style={{
                    height: '10px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* Correct answers (background layer) */}
                {correctCount !== undefined && correctCount > 0 && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${correctPercentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            height: '100%',
                            backgroundColor: '#28a745',
                            borderRadius: '10px'
                        }}
                    />
                )}

                {/* Current progress (foreground layer) */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                        position: 'absolute',
                        height: '100%',
                        backgroundColor: correctCount !== undefined ? '#2196F3' : '#2196F3',
                        borderRadius: '10px',
                        opacity: correctCount !== undefined ? 0.8 : 1
                    }}
                />
            </div>

            {/* Percentage indicator */}
            <div
                style={{
                    textAlign: 'center',
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#999'
                }}
            >
                {Math.round(percentage)}% مكتمل
            </div>
        </div>
    );
}
