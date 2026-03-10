import { supabase } from './supabase';

// Question Difficulty Levels
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

// Question Types
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'matching';

// Type-specific question data structures
export type MCQData = {
    choices: string[];
    correctIndex: number;
};

export type TrueFalseData = {
    correctAnswer: boolean;
};

export type FillBlankData = {
    acceptedAnswers: string[];
    caseSensitive: boolean;
    hint?: string;
};

export type MatchingData = {
    pairs: Array<{ left: string; right: string }>;
    allowPartialCredit: boolean;
};

export type QuestionTypeData = MCQData | TrueFalseData | FillBlankData | MatchingData;

export type Question = {
    id: string;
    quizId: string;
    text: string;
    // Legacy fields for backward compatibility
    choices: string[];
    correctIndex: number;
    imageUrl?: string;
    // New fields for adaptive quiz system
    difficulty: QuestionDifficulty;
    question_type: QuestionType;
    type_data: QuestionTypeData;
    points: number;
};

export type Quiz = {
    id: string;
    lessonId: string;
    title: string;
    questions: Question[];
};

export type Lesson = {
    id: string;
    title: string;
    content: string;
    subject: string;
    grade: number;
    simplified_arabic?: string;
    podcast_script?: string;
    quizzes: Quiz[];
    createdAt: number;
    // Deprecated but kept for type compatibility if needed during migration logic internally
    questions?: Question[];
};

export type Attempt = {
    id: string;
    studentName: string;
    lessonId: string;
    quizId?: string; // Optional for backward compatibility
    // Record<QuestionId, SelectedOptionIndexString>
    answers: Record<string, string>;
    score: number;
    totalQuestions: number;
    createdAt: number;
    // New fields for adaptive quiz system
    difficulty?: QuestionDifficulty;
    points_earned?: number;
};

// Student Progress: Tracks adaptive difficulty progression
export type StudentProgress = {
    id: string;
    student_id: string;
    lesson_id: string;
    current_difficulty: QuestionDifficulty;
    easy_correct: number;
    easy_total: number;
    easy_mastered: boolean;
    medium_correct: number;
    medium_total: number;
    medium_mastered: boolean;
    hard_correct: number;
    hard_total: number;
    hard_mastered: boolean;
    last_attempt_at?: string;
    created_at: string;
};

// Achievement: Badge/achievement definitions
export type Achievement = {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    category: 'milestone' | 'streak' | 'mastery' | 'special';
    points: number;
    criteria: {
        type: 'quiz_count' | 'perfect_score' | 'streak' | 'difficulty_master' | 'question_types';
        value?: number;
        level?: QuestionDifficulty;
    };
    created_at: string;
};

// Student Achievement: Earned badges
export type StudentAchievement = {
    id: string;
    student_id: string;
    achievement_id: string;
    earned_at: string;
};

// Student Stats: Aggregate statistics
export type StudentStats = {
    id: string;
    student_id: string;
    total_points: number;
    total_quizzes: number;
    total_questions_answered: number;
    total_correct_answers: number;
    current_streak: number;
    longest_streak: number;
    last_activity_date: string | null;
    achievement_count: number;
    level: number;
    created_at: string;
    updated_at: string;
};

// Grading Result
export type GradeResult = {
    isCorrect: boolean;
    points: number;
    partialCredit?: number;
};

export type AppData = {
    lessons: Lesson[];
    attempts: Attempt[];
};

export type GeneratedLessonPreview = {
    title: string;
    subject: string;
    grade: number;
    objectives: string[];
    summary: string;
    content: string;
    simplified_arabic?: string;
    podcast_script?: string;
    quizzes: {
        title: string;
        questions: {
            text: string;
            choices: string[];
            correctIndex: number;
        }[];
    }[];
};

// --- Config ---
const STORAGE_MODE = process.env.NEXT_PUBLIC_STORAGE_MODE || 'local';
const DEMO_KEY = process.env.NEXT_PUBLIC_DEMO_KEY || 'demo';

// --- Lessons ---

// Helper for local access (exported for migration tool)
export function loadLocalLessons(): Promise<Lesson[]> {
    return new Promise((resolve) => {
        try {
            const data = localStorage.getItem('lessons');
            if (!data) resolve([]);
            else {
                const parsed = JSON.parse(data);
                // Migration: Convert old 'questions' on lesson to 'quizzes'
                const patched = parsed.map((l: any) => {
                    const lessonId = l.id || crypto.randomUUID();
                    let quizzes = l.quizzes || [];

                    // Migrate old questions to a default quiz if no quizzes exist
                    if ((!quizzes || quizzes.length === 0) && l.questions && l.questions.length > 0) {
                        const defaultQuizId = crypto.randomUUID();
                        quizzes = [{
                            id: defaultQuizId,
                            lessonId: lessonId,
                            title: 'Quiz',
                            questions: l.questions.map((q: any) => ({
                                ...q,
                                id: q.id || crypto.randomUUID(),
                                quizId: defaultQuizId
                            }))
                        }];
                    }

                    // Ensure explicit Subject/Grade defaults
                    return {
                        id: lessonId,
                        title: l.title,
                        content: l.content,
                        subject: l.subject || 'General',
                        grade: l.grade || 1,
                        quizzes: quizzes,
                        createdAt: l.createdAt || Date.now()
                    };
                });

                resolve(patched);
            }
        } catch (error) {
            console.error('Failed to load lessons', error);
            resolve([]);
        }
    });
}

export async function loadLessons(): Promise<Lesson[]> {
    if (typeof window === 'undefined') return [];

    if (STORAGE_MODE === 'supabase') {
        const { data, error } = await supabase
            .from('lessons')
            .select(`
                id,
                title,
                content,
                simplified_arabic,
                podcast_script,
                created_at,
                quizzes (
                    id,
                    title,
                    questions (
                        id,
                        question,
                        choices,
                        correct_index
                    )
                )
            `)
            .order('created_at', { ascending: false });

        console.log('[DEBUG] STORAGE_MODE:', STORAGE_MODE);
        if (error) {
            console.error('[DEBUG] Supabase load lessons failed:', error);
            return [];
        }
        console.log('[DEBUG] Supabase Data:', data);

        return (data || []).map((l: any) => {
            // Flatten questions from the first quiz for backward compatibility
            // This allows the UI to continue working while preserving the DB structure
            const firstQuiz = l.quizzes && l.quizzes.length > 0 ? l.quizzes[0] : null;
            const nestedQuestions = firstQuiz ? firstQuiz.questions || [] : [];

            return {
                id: l.id,
                title: l.title,
                content: l.content,
                simplified_arabic: l.simplified_arabic,
                podcast_script: l.podcast_script,
                subject: 'General', // Default since column missing
                grade: 1,           // Default since column missing
                createdAt: new Date(l.created_at).getTime(),
                // Map nested questions for backward compatibility with StudentPage
                questions: nestedQuestions.map((question: any) => ({
                    id: question.id,
                    quizId: firstQuiz.id,
                    text: question.question,
                    choices: question.choices,
                    correctIndex: question.correct_index
                })).sort((a: any, b: any) => a.text.localeCompare(b.text)),
                // Keep quizzes for future/other components
                quizzes: (l.quizzes || []).map((q: any) => ({
                    id: q.id,
                    lessonId: l.id,
                    title: q.title,
                    questions: [] // Not heavily used outside, but can map if needed
                }))
            };
        });
    } else {
        // Local Mode
        return loadLocalLessons();
    }
}

export async function saveLessons(lessons: Lesson[]): Promise<void> {
    if (typeof window === 'undefined') return;
    return new Promise((resolve) => {
        try {
            localStorage.setItem('lessons', JSON.stringify(lessons));
        } catch (error) {
            console.error('Failed to save lessons', error);
        }
        resolve();
    });
}

/**
 * De-duplicates lessons by title, keeping the most recent one.
 * This helps resolve issues where creation/migration might have overlapped.
 */
export async function deDuplicateLessons(): Promise<void> {
    if (STORAGE_MODE !== 'supabase') return;

    const { data, error } = await supabase.from('lessons').select('id, title, created_at').order('created_at', { ascending: false });
    if (error || !data) return;

    const seenTitles = new Set<string>();
    const idsToDelete: string[] = [];

    for (const lesson of data) {
        if (seenTitles.has(lesson.title)) {
            idsToDelete.push(lesson.id);
        } else {
            seenTitles.add(lesson.title);
        }
    }

    if (idsToDelete.length > 0) {
        console.log(`[CLEANUP] Deleting ${idsToDelete.length} duplicate lessons...`);
        const { error: delError } = await supabase.from('lessons').delete().in('id', idsToDelete);
        if (delError) console.error('[CLEANUP] Failed to delete duplicates:', delError);
    }
}

// --- Attempts (Async / Mode & Demo Key Aware) ---

export async function saveAttempt(attempt: Attempt): Promise<void> {
    if (STORAGE_MODE === 'supabase') {
        const { error } = await supabase.from('attempts').insert({
            id: attempt.id,
            student_name: attempt.studentName,
            lesson_id: attempt.lessonId, // Still useful for aggregation
            quiz_id: attempt.quizId,     // New field
            score: attempt.score,
            total_questions: attempt.totalQuestions,
            answers: attempt.answers,
            points_earned: attempt.points_earned || 0,
            created_at: new Date(attempt.createdAt).toISOString(),
            demo_key: DEMO_KEY
        });
        if (error) {
            console.error('Supabase save failed:', error);
            throw error;
        }
    } else {
        // Local Mode
        await new Promise<void>((resolve) => {
            try {
                const data = localStorage.getItem('quiz_attempts');
                const allAttempts: any[] = data ? JSON.parse(data) : [];
                allAttempts.push(attempt);
                localStorage.setItem('quiz_attempts', JSON.stringify(allAttempts));
            } catch (e) {
                console.error(e);
            }
            resolve();
        });
    }
}

export async function loadLocalAttempts(): Promise<Attempt[]> {
    return new Promise((resolve) => {
        try {
            const data = localStorage.getItem('quiz_attempts');
            if (!data) {
                resolve([]);
                return;
            }
            const parsed = JSON.parse(data);
            const normalized = parsed.map((a: any) => ({
                ...a,
                answers: (Array.isArray(a.answers)
                    ? a.answers.reduce((acc: Record<string, string>, val: number, idx: number) => ({ ...acc, [String(idx)]: String(val) }), {}) // Use Index as Key if legacy
                    : a.answers) || {},
                createdAt: a.createdAt || a.timestamp || Date.now(),
                id: a.id || crypto.randomUUID(),
                studentName: a.studentName || 'Student',
                totalQuestions: a.totalQuestions || 0,
                quizId: a.quizId || undefined // Ensure it exists if present
            }));
            normalized.sort((a: any, b: any) => b.createdAt - a.createdAt);
            resolve(normalized);
        } catch (e) {
            console.error(e);
            resolve([]);
        }
    });
}

export async function loadAllAttempts(): Promise<Attempt[]> {
    if (STORAGE_MODE === 'supabase') {
        const { data, error } = await supabase
            .from('attempts')
            .select('*')
            .eq('demo_key', DEMO_KEY) // Filter by demo key
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase load failed:', error);
            return [];
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            studentName: row.student_name,
            lessonId: row.lesson_id,
            quizId: row.quiz_id,
            score: row.score,
            totalQuestions: row.total_questions,
            answers: row.answers || {},
            createdAt: new Date(row.created_at).getTime()
        }));
    } else {
        // Local Mode
        return loadLocalAttempts();
    }
}

export async function loadAttemptsByLesson(lessonId: string): Promise<Attempt[]> {
    const all = await loadAllAttempts();
    return all.filter(a => a.lessonId === lessonId);
}

export async function loadLatestAttempt(studentName: string, lessonId: string): Promise<Attempt | null> {
    if (STORAGE_MODE === 'supabase') {
        const { data, error } = await supabase
            .from('attempts')
            .select('*')
            .eq('lesson_id', lessonId)
            .eq('student_name', studentName)
            .eq('demo_key', DEMO_KEY)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Supabase load latest failed:', error);
        }

        if (!data) return null;

        return {
            id: data.id,
            studentName: data.student_name,
            lessonId: data.lesson_id,
            quizId: data.quiz_id,
            score: data.score,
            totalQuestions: data.total_questions,
            answers: data.answers || {},
            createdAt: new Date(data.created_at).getTime()
        };
    } else {
        const all = await loadAllAttempts();
        const relevant = all.filter(a => a.lessonId === lessonId && a.studentName === studentName);
        if (relevant.length === 0) return null;
        return relevant[0];
    }
}

export async function clearData(): Promise<void> {
    if (typeof window === 'undefined') return;
    return new Promise((resolve) => {
        try {
            localStorage.removeItem('lessons');
            localStorage.removeItem('quiz_attempts');
        } catch (error) {
            console.error('Failed to clear data', error);
        }
        resolve();
    });
}

export async function exportData(): Promise<string> {
    if (typeof window === 'undefined') return '';
    const lessons = await loadLessons();
    const attempts = await loadAllAttempts();
    // Note: Exporting hybrid data (Local + Cloud) depending on mode
    return JSON.stringify({ lessons, attempts }, null, 2);
}

export async function importData(jsonData: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
        const data: AppData = JSON.parse(jsonData);
        if (!data.lessons || !Array.isArray(data.lessons)) {
            throw new Error('Invalid lessons data');
        }
        const attempts = Array.isArray(data.attempts) ? data.attempts : [];

        await saveLessons(data.lessons);

        await new Promise<void>((resolve) => {
            localStorage.setItem('quiz_attempts', JSON.stringify(attempts));
            resolve();
        });

        return true;
    } catch (error) {
        console.error('Failed to import data', error);
        return false;
    }
}

// --- Student Progress Functions ---

export async function getStudentProgress(studentId: string, lessonId: string): Promise<StudentProgress | null> {
    if (STORAGE_MODE !== 'supabase') return null;

    const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Failed to load student progress:', error);
    }

    if (!data) return null;

    return {
        id: data.id,
        student_id: data.student_id,
        lesson_id: data.lesson_id,
        current_difficulty: data.current_difficulty,
        easy_correct: data.easy_correct,
        easy_total: data.easy_total,
        easy_mastered: data.easy_mastered,
        medium_correct: data.medium_correct,
        medium_total: data.medium_total,
        medium_mastered: data.medium_mastered,
        hard_correct: data.hard_correct,
        hard_total: data.hard_total,
        hard_mastered: data.hard_mastered,
        last_attempt_at: data.last_attempt_at,
        created_at: data.created_at
    };
}

export async function saveStudentProgress(progress: Partial<StudentProgress> & { student_id: string; lesson_id: string }): Promise<void> {
    if (STORAGE_MODE !== 'supabase') return;

    const { error } = await supabase
        .from('student_progress')
        .upsert({
            student_id: progress.student_id,
            lesson_id: progress.lesson_id,
            current_difficulty: progress.current_difficulty || 'easy',
            easy_correct: progress.easy_correct || 0,
            easy_total: progress.easy_total || 0,
            easy_mastered: progress.easy_mastered || false,
            medium_correct: progress.medium_correct || 0,
            medium_total: progress.medium_total || 0,
            medium_mastered: progress.medium_mastered || false,
            hard_correct: progress.hard_correct || 0,
            hard_total: progress.hard_total || 0,
            hard_mastered: progress.hard_mastered || false,
            last_attempt_at: progress.last_attempt_at || new Date().toISOString()
        }, { onConflict: 'student_id,lesson_id' });

    if (error) {
        console.error('Failed to save student progress:', error);
        throw error;
    }
}

// --- Achievement Functions ---

export async function getAllAchievements(): Promise<Achievement[]> {
    if (STORAGE_MODE !== 'supabase') return [];

    const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true });

    if (error) {
        console.error('Failed to load achievements:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        icon: row.icon,
        category: row.category,
        points: row.points,
        criteria: row.criteria,
        created_at: row.created_at
    }));
}

export async function getStudentAchievements(studentId: string): Promise<StudentAchievement[]> {
    if (STORAGE_MODE !== 'supabase') return [];

    const { data, error } = await supabase
        .from('student_achievements')
        .select('*')
        .eq('student_id', studentId)
        .order('earned_at', { ascending: false });

    if (error) {
        console.error('Failed to load student achievements:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        achievement_id: row.achievement_id,
        earned_at: row.earned_at
    }));
}

export async function awardAchievement(studentId: string, achievementId: string): Promise<void> {
    if (STORAGE_MODE !== 'supabase') return;

    const { error } = await supabase
        .from('student_achievements')
        .insert({
            student_id: studentId,
            achievement_id: achievementId,
            earned_at: new Date().toISOString()
        });

    if (error && error.code !== '23505') { // Ignore duplicate errors
        console.error('Failed to award achievement:', error);
        throw error;
    }
}

// --- Student Stats Functions ---

export async function getStudentStats(studentId: string): Promise<StudentStats | null> {
    if (STORAGE_MODE !== 'supabase') return null;

    const { data, error } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Failed to load student stats:', error);
    }

    if (!data) return null;

    return {
        id: data.id,
        student_id: data.student_id,
        total_points: data.total_points,
        total_quizzes: data.total_quizzes,
        total_questions_answered: data.total_questions_answered,
        total_correct_answers: data.total_correct_answers,
        current_streak: data.current_streak,
        longest_streak: data.longest_streak,
        last_activity_date: data.last_activity_date,
        achievement_count: data.achievement_count,
        level: data.level,
        created_at: data.created_at,
        updated_at: data.updated_at
    };
}

export async function saveStudentStats(stats: Partial<StudentStats> & { student_id: string }): Promise<void> {
    if (STORAGE_MODE !== 'supabase') return;

    const { error } = await supabase
        .from('student_stats')
        .upsert({
            student_id: stats.student_id,
            total_points: stats.total_points || 0,
            total_quizzes: stats.total_quizzes || 0,
            total_questions_answered: stats.total_questions_answered || 0,
            total_correct_answers: stats.total_correct_answers || 0,
            current_streak: stats.current_streak || 0,
            longest_streak: stats.longest_streak || 0,
            last_activity_date: stats.last_activity_date,
            achievement_count: stats.achievement_count || 0,
            level: stats.level || 1,
            updated_at: new Date().toISOString()
        }, { onConflict: 'student_id' });

    if (error) {
        console.error('Failed to save student stats:', error);
        throw error;
    }
}

export async function updateStudentStats(
    studentId: string,
    updates: Partial<Omit<StudentStats, 'id' | 'student_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
    if (STORAGE_MODE !== 'supabase') return;

    // Get current stats
    const currentStats = await getStudentStats(studentId);

    if (!currentStats) {
        // Create new stats record
        await saveStudentStats({
            student_id: studentId,
            ...updates
        });
    } else {
        // Update existing stats
        await saveStudentStats({
            ...currentStats,
            ...updates
        });
    }
}
