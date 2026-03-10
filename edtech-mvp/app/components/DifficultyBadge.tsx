/**
 * Difficulty Badge Component
 *
 * Displays the difficulty level with appropriate styling and animation
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { QuestionDifficulty } from '@/app/lib/storage';

export interface DifficultyBadgeProps {
    difficulty: QuestionDifficulty;
    animated?: boolean;
}

export default function DifficultyBadge({ difficulty, animated = true }: DifficultyBadgeProps) {
    const config = getDifficultyConfig(difficulty);

    const badge = (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '2rem',
                backgroundColor: config.bgColor,
                color: config.textColor,
                fontWeight: '600',
                fontSize: '0.875rem',
                border: `2px solid ${config.borderColor}`,
                direction: 'rtl'
            }}
        >
            <span style={{ fontSize: '1rem' }}>{config.icon}</span>
            <span>{config.label}</span>
        </div>
    );

    if (!animated) {
        return badge;
    }

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            {badge}
        </motion.div>
    );
}

function getDifficultyConfig(difficulty: QuestionDifficulty) {
    switch (difficulty) {
        case 'easy':
            return {
                label: 'سهل',
                icon: '⭐',
                bgColor: '#d4edda',
                textColor: '#155724',
                borderColor: '#28a745'
            };
        case 'medium':
            return {
                label: 'متوسط',
                icon: '⭐⭐',
                bgColor: '#fff3cd',
                textColor: '#856404',
                borderColor: '#ffc107'
            };
        case 'hard':
            return {
                label: 'صعب',
                icon: '⭐⭐⭐',
                bgColor: '#f8d7da',
                textColor: '#721c24',
                borderColor: '#dc3545'
            };
    }
}
