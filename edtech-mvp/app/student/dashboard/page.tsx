/**
 * Student Dashboard Page
 *
 * Displays personal progress, achievements, stats, and activity
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
    getStudentStats,
    getAllAchievements,
    getStudentAchievements,
    loadLessons,
    type StudentStats,
    type Achievement,
    type Lesson
} from '@/app/lib/storage';
import { getAchievementProgress, getStreakMessage, calculateLevel, getPointsForNextLevel } from '@/app/lib/gamification';
import { getMasteryStatus } from '@/app/lib/adaptive';

export default function StudentDashboard() {
    const [stats, setStats] = useState<StudentStats | null>(null);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [earnedAchievements, setEarnedAchievements] = useState<Set<string>>(new Set());
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);

    // For demo purposes, using a fixed student ID
    // In production, this would come from authentication
    const studentId = 'demo-student-id';

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        setLoading(true);

        try {
            // Load student stats
            const statsData = await getStudentStats(studentId);
            setStats(statsData);

            // Load achievements
            const achievementProgress = await getAchievementProgress(studentId);
            setAchievements([...achievementProgress.earned, ...achievementProgress.locked]);
            setEarnedAchievements(new Set(achievementProgress.earned.map(a => a.id)));

            // Load lessons for progress tracking
            const lessonsData = await loadLessons();
            setLessons(lessonsData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f5f5f5'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                    <div style={{ fontSize: '1.25rem', color: '#666' }}>جاري تحميل لوحة التحكم...</div>
                </div>
            </div>
        );
    }

    const currentLevel = stats?.level || 1;
    const currentPoints = stats?.total_points || 0;
    const pointsForNext = getPointsForNextLevel(currentLevel);
    const progressToNext = currentPoints >= pointsForNext ? 100 : ((currentPoints % 500) / 500) * 100;

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f5f5f5',
            padding: '2rem 1rem'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '2rem',
                    direction: 'rtl'
                }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        color: '#333',
                        marginBottom: '0.5rem'
                    }}>
                        لوحة التحكم الشخصية
                    </h1>
                    <p style={{ fontSize: '1.125rem', color: '#666' }}>
                        تابع تقدمك وإنجازاتك
                    </p>
                </div>

                {/* Stats Overview Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    {/* Level Card */}
                    <StatsCard
                        icon="🏆"
                        title="المستوى"
                        value={currentLevel}
                        subtitle={`${currentPoints} نقطة`}
                        color="#FFD700"
                    />

                    {/* Quizzes Card */}
                    <StatsCard
                        icon="📝"
                        title="الاختبارات المكتملة"
                        value={stats?.total_quizzes || 0}
                        subtitle={`${stats?.total_questions_answered || 0} سؤال`}
                        color="#2196F3"
                    />

                    {/* Accuracy Card */}
                    <StatsCard
                        icon="🎯"
                        title="نسبة الصحة"
                        value={stats?.total_questions_answered
                            ? Math.round((stats.total_correct_answers / stats.total_questions_answered) * 100)
                            : 0}
                        valueUnit="%"
                        subtitle={`${stats?.total_correct_answers || 0} صحيحة`}
                        color="#4CAF50"
                    />

                    {/* Streak Card */}
                    <StatsCard
                        icon="🔥"
                        title="السلسلة الحالية"
                        value={stats?.current_streak || 0}
                        subtitle={`أطول: ${stats?.longest_streak || 0} يوم`}
                        color="#FF5722"
                    />
                </div>

                {/* Level Progress Bar */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    direction: 'rtl'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333' }}>
                                المستوى {currentLevel}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                {pointsForNext - currentPoints} نقطة للمستوى التالي
                            </div>
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            backgroundColor: '#FFD700',
                            borderRadius: '50%',
                            width: '60px',
                            height: '60px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            🏆
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{
                        height: '12px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '6px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            backgroundColor: '#FFD700',
                            width: `${Math.min(progressToNext, 100)}%`,
                            transition: 'width 0.3s ease',
                            boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                        }} />
                    </div>
                </div>

                {/* Achievements Gallery */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    direction: 'rtl'
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '1rem',
                        textAlign: 'right'
                    }}>
                        🏅 الإنجازات ({earnedAchievements.size}/{achievements.length})
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '1rem'
                    }}>
                        {achievements.map((achievement) => {
                            const isEarned = earnedAchievements.has(achievement.id);
                            return (
                                <div
                                    key={achievement.id}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: isEarned ? '#f0f8ff' : '#f5f5f5',
                                        border: `2px solid ${isEarned ? '#2196F3' : '#e0e0e0'}`,
                                        textAlign: 'center',
                                        opacity: isEarned ? 1 : 0.5,
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer'
                                    }}
                                    title={achievement.description}
                                >
                                    <div style={{
                                        fontSize: '2.5rem',
                                        marginBottom: '0.5rem',
                                        filter: isEarned ? 'none' : 'grayscale(100%)'
                                    }}>
                                        {achievement.icon}
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: isEarned ? '#333' : '#999',
                                        marginBottom: '0.25rem',
                                        direction: 'rtl'
                                    }}>
                                        {achievement.name}
                                    </div>
                                    {isEarned && (
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#FFD700',
                                            fontWeight: '600'
                                        }}>
                                            +{achievement.points} نقطة
                                        </div>
                                    )}
                                    {!isEarned && (
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#999'
                                        }}>
                                            🔒 مقفل
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Streak Message */}
                {stats && (
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        marginBottom: '2rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        textAlign: 'center',
                        direction: 'rtl'
                    }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                            {getStreakMessage(stats.current_streak)}
                        </div>
                        {stats.current_streak > 0 && (
                            <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                آخر نشاط: {stats.last_activity_date || 'اليوم'}
                            </div>
                        )}
                    </div>
                )}

                {/* Back to Lessons Button */}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <a
                        href="/student"
                        style={{
                            display: 'inline-block',
                            padding: '1rem 2rem',
                            backgroundColor: '#2196F3',
                            color: '#ffffff',
                            borderRadius: '0.5rem',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '1.125rem',
                            transition: 'background-color 0.2s ease',
                            direction: 'rtl'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
                    >
                        📚 العودة للدروس
                    </a>
                </div>
            </div>
        </div>
    );
}

// Stats Card Component
function StatsCard({
    icon,
    title,
    value,
    valueUnit = '',
    subtitle,
    color
}: {
    icon: string;
    title: string;
    value: number | string;
    valueUnit?: string;
    subtitle: string;
    color: string;
}) {
    return (
        <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '1rem',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default',
            direction: 'rtl',
            textAlign: 'right'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
        >
            <div style={{
                fontSize: '2.5rem',
                marginBottom: '0.5rem'
            }}>
                {icon}
            </div>
            <div style={{
                fontSize: '0.875rem',
                color: '#666',
                marginBottom: '0.5rem'
            }}>
                {title}
            </div>
            <div style={{
                fontSize: '2rem',
                fontWeight: '700',
                color,
                marginBottom: '0.25rem'
            }}>
                {value}{valueUnit}
            </div>
            <div style={{
                fontSize: '0.75rem',
                color: '#999'
            }}>
                {subtitle}
            </div>
        </div>
    );
}
