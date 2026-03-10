/**
 * Gamification System
 *
 * Handles points, achievements, streaks, and student statistics.
 * Designed for personal progress (not competitive rankings).
 */

import {
    getStudentStats,
    saveStudentStats,
    updateStudentStats,
    getAllAchievements,
    getStudentAchievements,
    awardAchievement,
    getStudentProgress,
    type Achievement,
    type StudentStats,
    type StudentAchievement,
    type Question,
    type Attempt,
    type QuestionDifficulty
} from './storage';
import type { GradeResult } from './grading';

// Point values configuration
export const POINTS_CONFIG = {
    easy: 10,
    medium: 20,
    hard: 40,
    perfectBonus: 50,
    firstAttemptBonus: 10
};

// Level thresholds
export const LEVEL_THRESHOLDS = [
    { level: 1, points: 0 },
    { level: 2, points: 101 },
    { level: 3, points: 251 },
    { level: 4, points: 501 },
    { level: 5, points: 1001 }
];

/**
 * Calculate points earned from a quiz attempt
 */
export function calculatePoints(
    questions: Question[],
    results: Array<{ questionId: string; result: GradeResult }>,
    isPerfect: boolean,
    isFirstAttempt: boolean = false
): number {
    let totalPoints = 0;

    // Sum up points from each question
    for (const { result } of results) {
        totalPoints += result.points;
    }

    // Perfect score bonus
    if (isPerfect) {
        totalPoints += POINTS_CONFIG.perfectBonus;
    }

    // First attempt bonus (optional)
    if (isFirstAttempt) {
        totalPoints += POINTS_CONFIG.firstAttemptBonus;
    }

    return totalPoints;
}

/**
 * Calculate student level based on total points
 */
export function calculateLevel(totalPoints: number): number {
    if (totalPoints <= 100) return 1;
    if (totalPoints <= 250) return 2;
    if (totalPoints <= 500) return 3;
    if (totalPoints <= 1000) return 4;

    // Level 5 and beyond: every 500 points
    return 5 + Math.floor((totalPoints - 1000) / 500);
}

/**
 * Get points needed for next level
 */
export function getPointsForNextLevel(currentLevel: number): number {
    if (currentLevel === 1) return 101;
    if (currentLevel === 2) return 251;
    if (currentLevel === 3) return 501;
    if (currentLevel === 4) return 1001;

    // Level 5+: next threshold is current + 500
    return 1001 + (currentLevel - 4) * 500;
}

/**
 * Update student streak based on current activity
 */
export async function updateStreak(studentId: string): Promise<{
    streakIncreased: boolean;
    streakBroken: boolean;
    currentStreak: number;
    newStreak?: number; // New streak achievement unlocked
}> {
    const stats = await getStudentStats(studentId);
    const today = new Date().toISOString().split('T')[0];

    if (!stats) {
        // First activity ever
        await saveStudentStats({
            student_id: studentId,
            current_streak: 1,
            longest_streak: 1,
            last_activity_date: today
        });

        return {
            streakIncreased: true,
            streakBroken: false,
            currentStreak: 1
        };
    }

    if (!stats.last_activity_date) {
        // No previous activity date
        await updateStudentStats(studentId, {
            current_streak: 1,
            longest_streak: Math.max(1, stats.longest_streak),
            last_activity_date: today
        });

        return {
            streakIncreased: true,
            streakBroken: false,
            currentStreak: 1
        };
    }

    const lastDate = new Date(stats.last_activity_date);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Same day - no change
        return {
            streakIncreased: false,
            streakBroken: false,
            currentStreak: stats.current_streak
        };
    } else if (diffDays === 1) {
        // Consecutive day - increment streak
        const newStreak = stats.current_streak + 1;
        const newLongest = Math.max(stats.longest_streak, newStreak);

        await updateStudentStats(studentId, {
            current_streak: newStreak,
            longest_streak: newLongest,
            last_activity_date: today
        });

        return {
            streakIncreased: true,
            streakBroken: false,
            currentStreak: newStreak,
            newStreak: newStreak // Can trigger achievements
        };
    } else {
        // Streak broken
        const oldStreak = stats.current_streak;

        await updateStudentStats(studentId, {
            current_streak: 1,
            last_activity_date: today
        });

        return {
            streakIncreased: false,
            streakBroken: oldStreak > 1,
            currentStreak: 1
        };
    }
}

/**
 * Update student stats after quiz completion
 */
export async function updateStatsAfterQuiz(
    studentId: string,
    totalQuestions: number,
    correctAnswers: number,
    pointsEarned: number
): Promise<{ leveledUp: boolean; newLevel?: number; oldLevel?: number }> {
    const currentStats = await getStudentStats(studentId);

    if (!currentStats) {
        // Create new stats
        const newLevel = calculateLevel(pointsEarned);

        await saveStudentStats({
            student_id: studentId,
            total_points: pointsEarned,
            total_quizzes: 1,
            total_questions_answered: totalQuestions,
            total_correct_answers: correctAnswers,
            level: newLevel
        });

        return { leveledUp: false };
    }

    // Calculate new totals
    const newTotalPoints = currentStats.total_points + pointsEarned;
    const newTotalQuizzes = currentStats.total_quizzes + 1;
    const newTotalQuestions = currentStats.total_questions_answered + totalQuestions;
    const newTotalCorrect = currentStats.total_correct_answers + correctAnswers;

    const oldLevel = currentStats.level;
    const newLevel = calculateLevel(newTotalPoints);
    const leveledUp = newLevel > oldLevel;

    await updateStudentStats(studentId, {
        total_points: newTotalPoints,
        total_quizzes: newTotalQuizzes,
        total_questions_answered: newTotalQuestions,
        total_correct_answers: newTotalCorrect,
        level: newLevel
    });

    return {
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        oldLevel: leveledUp ? oldLevel : undefined
    };
}

/**
 * Check and award achievements based on current stats and progress
 */
export async function checkAndAwardAchievements(
    studentId: string,
    context: {
        isPerfect?: boolean;
        difficulty?: QuestionDifficulty;
        difficultyMastered?: QuestionDifficulty;
        newStreak?: number;
        questionTypesUsed?: Set<string>;
    }
): Promise<Achievement[]> {
    const allAchievements = await getAllAchievements();
    const earnedAchievements = await getStudentAchievements(studentId);
    const earnedCodes = new Set(
        await Promise.all(
            earnedAchievements.map(async (sa) => {
                const achievement = allAchievements.find(a => a.id === sa.achievement_id);
                return achievement?.code || '';
            })
        )
    );

    const stats = await getStudentStats(studentId);
    if (!stats) return [];

    const newlyEarned: Achievement[] = [];

    for (const achievement of allAchievements) {
        // Skip if already earned
        if (earnedCodes.has(achievement.code)) continue;

        // Check criteria
        let shouldAward = false;

        switch (achievement.criteria.type) {
            case 'quiz_count':
                shouldAward = stats.total_quizzes >= (achievement.criteria.value || 0);
                break;

            case 'perfect_score':
                shouldAward = context.isPerfect === true;
                break;

            case 'streak':
                shouldAward = context.newStreak !== undefined &&
                             context.newStreak >= (achievement.criteria.value || 0);
                break;

            case 'difficulty_master':
                shouldAward = context.difficultyMastered === achievement.criteria.level;
                break;

            case 'question_types':
                // Award if student has used all 4 question types
                shouldAward = context.questionTypesUsed !== undefined &&
                             context.questionTypesUsed.size >= (achievement.criteria.value || 4);
                break;
        }

        if (shouldAward) {
            await awardAchievement(studentId, achievement.id);

            // Add points for achievement
            await updateStudentStats(studentId, {
                total_points: stats.total_points + achievement.points,
                achievement_count: stats.achievement_count + 1
            });

            newlyEarned.push(achievement);
        }
    }

    return newlyEarned;
}

/**
 * Get student's achievement progress summary
 */
export async function getAchievementProgress(studentId: string): Promise<{
    earned: Achievement[];
    locked: Achievement[];
    totalPoints: number;
    earnedCount: number;
    totalCount: number;
}> {
    const allAchievements = await getAllAchievements();
    const studentAchievements = await getStudentAchievements(studentId);

    const earnedIds = new Set(studentAchievements.map(sa => sa.achievement_id));
    const earned = allAchievements.filter(a => earnedIds.has(a.id));
    const locked = allAchievements.filter(a => !earnedIds.has(a.id));

    const totalPoints = earned.reduce((sum, a) => sum + a.points, 0);

    return {
        earned,
        locked,
        totalPoints,
        earnedCount: earned.length,
        totalCount: allAchievements.length
    };
}

/**
 * Get personalized motivational message based on performance
 */
export function getMotivationalMessage(
    correctAnswers: number,
    totalQuestions: number,
    isPerfect: boolean,
    leveledUp: boolean
): string {
    const percentage = (correctAnswers / totalQuestions) * 100;

    if (leveledUp) {
        return '🎉 مبروك! لقد تقدمت إلى مستوى جديد!';
    }

    if (isPerfect) {
        return '💯 ممتاز! درجة كاملة!';
    }

    if (percentage >= 80) {
        return '⭐ رائع جداً! أداء ممتاز!';
    }

    if (percentage >= 60) {
        return '👍 أحسنت! استمر في التقدم!';
    }

    if (percentage >= 40) {
        return '📚 جيد! حاول مرة أخرى للتحسين!';
    }

    return '💪 لا تستسلم! تعلم من أخطائك وحاول مجدداً!';
}

/**
 * Get streak message for display
 */
export function getStreakMessage(streak: number): string {
    if (streak === 0) {
        return 'ابدأ سلسلتك اليوم!';
    }

    if (streak === 1) {
        return '🔥 يوم واحد! استمر غداً!';
    }

    if (streak < 7) {
        return `🔥 ${streak} أيام متتالية! ممتاز!`;
    }

    if (streak < 14) {
        return `⚡ ${streak} يوم! أنت ملتزم جداً!`;
    }

    return `🌟 ${streak} يوم متواصل! أنت أسطورة!`;
}

/**
 * Get comprehensive gamification update after quiz
 *
 * Call this after a quiz is completed and graded
 */
export async function processQuizCompletion(
    studentId: string,
    lessonId: string,
    questions: Question[],
    results: Array<{ questionId: string; result: GradeResult }>,
    isFirstAttempt: boolean = false
): Promise<{
    pointsEarned: number;
    isPerfect: boolean;
    leveledUp: boolean;
    newLevel?: number;
    oldLevel?: number;
    streakUpdate: {
        streakIncreased: boolean;
        streakBroken: boolean;
        currentStreak: number;
    };
    newAchievements: Achievement[];
    motivationalMessage: string;
}> {
    // Calculate results
    const totalQuestions = questions.length;
    const correctAnswers = results.filter(r => r.result.isCorrect).length;
    const isPerfect = correctAnswers === totalQuestions;

    // Calculate points
    const pointsEarned = calculatePoints(questions, results, isPerfect, isFirstAttempt);

    // Update stats and check level up
    const levelUpdate = await updateStatsAfterQuiz(
        studentId,
        totalQuestions,
        correctAnswers,
        pointsEarned
    );

    // Update streak
    const streakUpdate = await updateStreak(studentId);

    // Get student progress for difficulty mastery check
    const progress = await getStudentProgress(studentId, lessonId);
    const difficultyMastered = progress?.easy_mastered ? 'easy' as QuestionDifficulty :
                               progress?.medium_mastered ? 'medium' as QuestionDifficulty :
                               progress?.hard_mastered ? 'hard' as QuestionDifficulty :
                               undefined;

    // Track question types used
    const questionTypesUsed = new Set(questions.map(q => q.question_type));

    // Check and award achievements
    const newAchievements = await checkAndAwardAchievements(studentId, {
        isPerfect,
        difficultyMastered,
        newStreak: streakUpdate.newStreak,
        questionTypesUsed
    });

    // Get motivational message
    const motivationalMessage = getMotivationalMessage(
        correctAnswers,
        totalQuestions,
        isPerfect,
        levelUpdate.leveledUp
    );

    return {
        pointsEarned,
        isPerfect,
        leveledUp: levelUpdate.leveledUp,
        newLevel: levelUpdate.newLevel,
        oldLevel: levelUpdate.oldLevel,
        streakUpdate,
        newAchievements,
        motivationalMessage
    };
}
