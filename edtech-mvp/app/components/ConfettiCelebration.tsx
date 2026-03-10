/**
 * Confetti Celebration Component
 *
 * Displays confetti animation for perfect scores and special achievements
 */

'use client';

import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

export interface ConfettiCelebrationProps {
    trigger: boolean;
    duration?: number;
}

export default function ConfettiCelebration({
    trigger,
    duration = 5000
}: ConfettiCelebrationProps) {
    const [isActive, setIsActive] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        // Set window size on mount
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
        });

        // Update on resize
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (trigger) {
            setIsActive(true);
            const timer = setTimeout(() => setIsActive(false), duration);
            return () => clearTimeout(timer);
        }
    }, [trigger, duration]);

    if (!isActive) return null;

    return (
        <Confetti
            width={windowSize.width}
            height={windowSize.height}
            numberOfPieces={200}
            recycle={false}
            gravity={0.3}
            colors={['#FFD700', '#FFA500', '#FF6347', '#4CAF50', '#2196F3', '#9C27B0']}
        />
    );
}
