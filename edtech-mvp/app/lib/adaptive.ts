/**
 * Adaptive Difficulty Algorithm
 *
 * This module manages the adaptive difficulty system for quizzes.
 * Students progress from easy → medium → hard based on performance.
 *
 * Mastery Criteria:
 * - 80% correct answers at current difficulty
 * - Minimum 5 questions answered at that difficulty
 * - Once mastered, progress to next level
 */

import {
    getStudentProgress,
    saveStudentProgress,
    type StudentProgress,
    type Attempt,
    type QuestionDifficulty,
    type Question
} from './storage';
import { supabase } from './supabase';

// Mastery configuration
const MASTERY_THRESHOLD = 0.80; // 80% accuracy required
const MINIMUM_QUESTIONS = 5;    // Minimum questions to qualify for mastery

export type ProgressionResult = {
    masteredLevel?: QuestionDifficulty;
    nextLevel?: QuestionDifficulty;
    progressionMessage?: string;
};

/**
 * Get or create student progress record
 */
async function getOrCreateProgress(
    studentId: string,
    lessonId: string
): Promise<StudentProgress> {
    const existing = await getStudentProgress(studentId, lessonId);

    if (existing) {
        return existing;
    }

    // Create new progress record
    const newProgress: StudentProgress = {
        id: crypto.randomUUID(),
        student_id: studentId,
        lesson_id: lessonId,
        current_difficulty: 'easy',
        easy_correct: 0,
        easy_total: 0,
        easy_mastered: false,
        medium_correct: 0,
        medium_total: 0,
        medium_mastered: false,
        hard_correct: 0,
        hard_total: 0,
        hard_mastered: false,
        last_attempt_at: new Date().toISOString(),
        created_at: new Date().toISOString()
    };

    await saveStudentProgress(newProgress);
    return newProgress;
}

/**
 * Update student progress after completing a quiz attempt
 *
 * @param studentId - Student identifier
 * @param lessonId - Lesson identifier
 * @param attempt - Quiz attempt with score
 * @returns Progression result with mastery info
 */
export async function updateStudentProgress(
    studentId: string,
    lessonId: string,
    attempt: Attempt
): Promise<ProgressionResult> {
    // Get or create progress record
    const progress = await getOrCreateProgress(studentId, lessonId);

    const difficulty = progress.current_difficulty;

    // Update stats for current difficulty
    const correctKey = `${difficulty}_correct` as keyof StudentProgress;
    const totalKey = `${difficulty}_total` as keyof StudentProgress;
    const masteredKey = `${difficulty}_mastered` as keyof StudentProgress;

    const updatedProgress: StudentProgress = {
        ...progress,
        [correctKey]: (progress[correctKey] as number) + attempt.score,
        [totalKey]: (progress[totalKey] as number) + attempt.totalQuestions,
        last_attempt_at: new Date().toISOString()
    };

    // Calculate performance
    const correctCount = updatedProgress[correctKey] as number;
    const totalCount = updatedProgress[totalKey] as number;
    const performance = totalCount > 0 ? correctCount / totalCount : 0;

    // Check for mastery (80% accuracy + 5 questions minimum)
    const hasMinimumAttempts = totalCount >= MINIMUM_QUESTIONS;
    const meetsThreshold = performance >= MASTERY_THRESHOLD;
    const alreadyMastered = updatedProgress[masteredKey] as boolean;

    if (meetsThreshold && hasMinimumAttempts && !alreadyMastered) {
        // Mark as mastered
        updatedProgress[masteredKey] = true;

        // Progress to next level
        const levelProgression: Record<QuestionDifficulty, QuestionDifficulty | null> = {
            easy: 'medium',
            medium: 'hard',
            hard: null
        };

        const nextLevel = levelProgression[difficulty];

        if (nextLevel) {
            updatedProgress.current_difficulty = nextLevel;
            await saveStudentProgress(updatedProgress);

            return {
                masteredLevel: difficulty,
                nextLevel,
                progressionMessage: getProgressionMessage(difficulty, nextLevel)
            };
        } else {
            // Mastered all levels!
            await saveStudentProgress(updatedProgress);

            return {
                masteredLevel: difficulty,
                progressionMessage: '👑 Incredible! You mastered all difficulty levels!'
            };
        }
    }

    // Save updated progress (no mastery yet)
    await saveStudentProgress(updatedProgress);
    return {};
}

/**
 * Get questions filtered by student's current difficulty level
 *
 * @param studentId - Student identifier
 * @param lessonId - Lesson identifier
 * @param quizId - Quiz identifier
 * @returns Questions at appropriate difficulty
 */
export async function getQuestionsForStudent(
    studentId: string,
    lessonId: string,
    quizId: string
): Promise<Question[]> {
    const progress = await getStudentProgress(studentId, lessonId);
    const difficulty = progress?.current_difficulty || 'easy';

    // Fetch questions at current difficulty level from Supabase
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('difficulty', difficulty);

    if (error) {
        console.error('Failed to fetch questions by difficulty:', error);
        return [];
    }

    // Map database format to Question type
    return (data || []).map((row: any) => ({
        id: row.id,
        quizId: row.quiz_id,
        text: row.question,
        choices: row.choices || [],
        correctIndex: row.correct_index || 0,
        imageUrl: row.image_url,
        difficulty: row.difficulty,
        question_type: row.question_type,
        type_data: row.type_data,
        points: row.points
    }));
}

/**
 * Get current difficulty level for a student on a lesson
 *
 * @param studentId - Student identifier
 * @param lessonId - Lesson identifier
 * @returns Current difficulty level
 */
export async function getCurrentDifficulty(
    studentId: string,
    lessonId: string
): Promise<QuestionDifficulty> {
    const progress = await getStudentProgress(studentId, lessonId);
    return progress?.current_difficulty || 'easy';
}

/**
 * Get mastery status for all difficulty levels
 *
 * @param studentId - Student identifier
 * @param lessonId - Lesson identifier
 * @returns Mastery status object
 */
export async function getMasteryStatus(
    studentId: string,
    lessonId: string
): Promise<{
    easy: { mastered: boolean; performance: number };
    medium: { mastered: boolean; performance: number };
    hard: { mastered: boolean; performance: number };
}> {
    const progress = await getStudentProgress(studentId, lessonId);

    if (!progress) {
        return {
            easy: { mastered: false, performance: 0 },
            medium: { mastered: false, performance: 0 },
            hard: { mastered: false, performance: 0 }
        };
    }

    return {
        easy: {
            mastered: progress.easy_mastered,
            performance: progress.easy_total > 0 ? progress.easy_correct / progress.easy_total : 0
        },
        medium: {
            mastered: progress.medium_mastered,
            performance: progress.medium_total > 0 ? progress.medium_correct / progress.medium_total : 0
        },
        hard: {
            mastered: progress.hard_mastered,
            performance: progress.hard_total > 0 ? progress.hard_correct / progress.hard_total : 0
        }
    };
}

/**
 * Check if student can attempt a specific difficulty level
 *
 * @param studentId - Student identifier
 * @param lessonId - Lesson identifier
 * @param targetDifficulty - Difficulty level to check
 * @returns Whether student can attempt this difficulty
 */
export async function canAttemptDifficulty(
    studentId: string,
    lessonId: string,
    targetDifficulty: QuestionDifficulty
): Promise<boolean> {
    const progress = await getStudentProgress(studentId, lessonId);

    if (!progress) {
        // New student can only attempt easy
        return targetDifficulty === 'easy';
    }

    switch (targetDifficulty) {
        case 'easy':
            return true; // Always can attempt easy

        case 'medium':
            return progress.easy_mastered || progress.current_difficulty === 'medium' || progress.current_difficulty === 'hard';

        case 'hard':
            return progress.medium_mastered || progress.current_difficulty === 'hard';

        default:
            return false;
    }
}

/**
 * Generate progression message based on difficulty transition
 *
 * @param fromLevel - Previous difficulty level
 * @param toLevel - New difficulty level
 * @returns Celebration message
 */
function getProgressionMessage(fromLevel: QuestionDifficulty, toLevel: QuestionDifficulty): string {
    const messages: Record<string, string> = {
        'easy-medium': '🎉 Amazing! You mastered the Easy level! Moving to Medium difficulty.',
        'medium-hard': '⭐ Incredible! You conquered Medium! Now trying Hard difficulty.',
    };

    const key = `${fromLevel}-${toLevel}`;
    return messages[key] || `🎉 Great job! Moving from ${fromLevel} to ${toLevel}!`;
}

/**
 * Get progress summary for display
 *
 * @param studentId - Student identifier
 * @param lessonId - Lesson identifier
 * @returns Human-readable progress summary
 */
export async function getProgressSummary(
    studentId: string,
    lessonId: string
): Promise<string> {
    const progress = await getStudentProgress(studentId, lessonId);

    if (!progress) {
        return 'Just getting started! Begin with Easy level.';
    }

    const mastery = await getMasteryStatus(studentId, lessonId);

    if (mastery.hard.mastered) {
        return '👑 Legend! You mastered all difficulty levels!';
    } else if (mastery.medium.mastered) {
        return `🌟 Challenge Seeker! Currently on Hard difficulty (${Math.round(mastery.hard.performance * 100)}% accuracy).`;
    } else if (mastery.easy.mastered) {
        return `⭐ Easy Conqueror! Currently on Medium difficulty (${Math.round(mastery.medium.performance * 100)}% accuracy).`;
    } else {
        return `📚 Learning on Easy difficulty (${Math.round(mastery.easy.performance * 100)}% accuracy, need 80% to advance).`;
    }
}
