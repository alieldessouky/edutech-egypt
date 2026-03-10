/**
 * Achievement Unlock Modal
 *
 * Displays when a student earns a new achievement
 * Features celebratory animations and visual feedback
 */

'use client';

import React, { useEffect, useState } from 'react';
import type { Achievement } from '@/app/lib/storage';

export interface AchievementUnlockModalProps {
    achievements: Achievement[];
    onClose: () => void;
}

export default function AchievementUnlockModal({
    achievements,
    onClose
}: AchievementUnlockModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const currentAchievement = achievements[currentIndex];
    const hasMore = currentIndex < achievements.length - 1;

    useEffect(() => {
        // Trigger animation on mount or index change
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 600);
        return () => clearTimeout(timer);
    }, [currentIndex]);

    const handleNext = () => {
        if (hasMore) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
        }
    };

    if (!currentAchievement) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
                backdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '1rem',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    position: 'relative' as const,
                    animation: isAnimating ? 'achievementPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'none'
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#999',
                        padding: '0.25rem'
                    }}
                    aria-label="Close"
                >
                    ×
                </button>

                {/* Achievement unlocked header */}
                <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#666',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    direction: 'ltr'
                }}>
                    Achievement Unlocked!
                </div>

                {/* Icon with glow animation */}
                <div
                    style={{
                        fontSize: '5rem',
                        marginBottom: '1rem',
                        animation: isAnimating ? 'iconGlow 0.6s ease-in-out' : 'none',
                        filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))'
                    }}
                >
                    {currentAchievement.icon}
                </div>

                {/* Achievement name */}
                <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    color: '#333',
                    marginBottom: '0.5rem',
                    direction: 'rtl'
                }}>
                    {currentAchievement.name}
                </h2>

                {/* Achievement description */}
                <p style={{
                    fontSize: '1rem',
                    color: '#666',
                    marginBottom: '1.5rem',
                    direction: 'rtl'
                }}>
                    {currentAchievement.description}
                </p>

                {/* Points earned */}
                <div style={{
                    display: 'inline-block',
                    padding: '0.5rem 1.5rem',
                    backgroundColor: '#ffd700',
                    borderRadius: '2rem',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)'
                }}>
                    +{currentAchievement.points} نقطة
                </div>

                {/* Category badge */}
                <div style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: getCategoryColor(currentAchievement.category),
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#ffffff',
                    marginBottom: '1.5rem',
                    marginLeft: '0.5rem',
                    textTransform: 'uppercase'
                }}>
                    {getCategoryLabel(currentAchievement.category)}
                </div>

                {/* Progress indicator (if multiple achievements) */}
                {achievements.length > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.5rem'
                    }}>
                        {achievements.map((_, idx) => (
                            <div
                                key={idx}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: idx === currentIndex ? '#FFD700' : '#ddd',
                                    transition: 'background-color 0.3s ease'
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Action button */}
                <button
                    onClick={handleNext}
                    style={{
                        padding: '0.75rem 2rem',
                        fontSize: '1rem',
                        fontWeight: '600',
                        backgroundColor: '#4CAF50',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        direction: 'rtl'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
                >
                    {hasMore ? 'التالي' : 'رائع!'}
                </button>

                {/* Sparkles decoration */}
                <div style={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    fontSize: '1.5rem',
                    animation: 'sparkle 1s ease-in-out infinite',
                    animationDelay: '0s'
                }}>
                    ✨
                </div>
                <div style={{
                    position: 'absolute',
                    top: '15%',
                    right: '15%',
                    fontSize: '1.25rem',
                    animation: 'sparkle 1s ease-in-out infinite',
                    animationDelay: '0.3s'
                }}>
                    ⭐
                </div>
                <div style={{
                    position: 'absolute',
                    bottom: '20%',
                    left: '15%',
                    fontSize: '1rem',
                    animation: 'sparkle 1s ease-in-out infinite',
                    animationDelay: '0.6s'
                }}>
                    💫
                </div>
            </div>

            {/* Inline CSS animations */}
            <style>{`
                @keyframes achievementPop {
                    0% {
                        transform: scale(0.5);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.05);
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                @keyframes iconGlow {
                    0%, 100% {
                        transform: scale(1) rotate(0deg);
                    }
                    25% {
                        transform: scale(1.2) rotate(-10deg);
                    }
                    75% {
                        transform: scale(1.2) rotate(10deg);
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
        </div>
    );
}

function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        milestone: '#2196F3',
        streak: '#FF5722',
        mastery: '#9C27B0',
        special: '#FFD700'
    };
    return colors[category] || '#999';
}

function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        milestone: 'Milestone',
        streak: 'Streak',
        mastery: 'Mastery',
        special: 'Special'
    };
    return labels[category] || category;
}
