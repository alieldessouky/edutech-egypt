import { supabase } from './supabase';
import { Lesson, Attempt, loadLocalLessons, loadLocalAttempts } from './storage';

const DEMO_KEY = process.env.NEXT_PUBLIC_DEMO_KEY || 'demo';

export async function migrateToCloud() {
    // Force loading from local storage regardless of current mode
    const localLessons = await loadLocalLessons();
    const localAttempts = await loadLocalAttempts();

    if (localLessons.length === 0 && localAttempts.length === 0) {
        return { success: true, message: 'No local data to migrate.' };
    }

    try {
        // 1. Migrate Classes (Create a default class if none exists)
        // For MVP, we'll just create one "Default Class" or use existing one if we can find it
        let { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id')
            .eq('title', 'Default Class')
            .single();

        if (!classData) {
            const { data: newClass, error: createError } = await supabase
                .from('classes')
                .insert({ title: 'Default Class' })
                .select('id')
                .single();

            if (createError) throw createError;
            classData = newClass;
        }

        const classId = classData!.id;

        // 2. Migrate Lessons
        for (const lesson of localLessons) {
            const { error: lessonError } = await supabase
                .from('lessons')
                .upsert({
                    id: lesson.id,
                    class_id: classId,
                    title: lesson.title,
                    content: lesson.content,
                    created_at: new Date(lesson.createdAt).toISOString(),
                }, { onConflict: 'id' });

            if (lessonError) throw lessonError;

            // 3. Migrate Quizzes & Questions
            // Local lessons now always have 'quizzes' array (normalized by loadLocalLessons)
            if (lesson.quizzes && lesson.quizzes.length > 0) {
                for (const quiz of lesson.quizzes) {
                    // Upsert Quiz
                    const { error: quizError } = await supabase
                        .from('quizzes')
                        .upsert({
                            id: quiz.id,
                            lesson_id: lesson.id,
                            title: quiz.title
                        }, { onConflict: 'id' });

                    if (quizError) throw quizError;

                    // Upsert Questions for this Quiz
                    if (quiz.questions && quiz.questions.length > 0) {
                        // Delete existing questions for this quiz to avoid duplicates
                        await supabase.from('questions').delete().eq('quiz_id', quiz.id);

                        const questionsToInsert = quiz.questions.map((q) => ({
                            quiz_id: quiz.id, // Correctly link to Quiz
                            question: q.text,
                            choices: q.choices,
                            correct_index: q.correctIndex
                        }));

                        const { error: qError } = await supabase.from('questions').insert(questionsToInsert);
                        if (qError) throw qError;
                    }
                }
            }
        }

        // 4. Migrate Attempts
        if (localAttempts.length > 0) {
            const attemptsToInsert = localAttempts.map(a => ({
                id: a.id,
                student_name: a.studentName,
                lesson_id: a.lessonId,
                quiz_id: a.quizId || null, // Handle optional quizId
                score: a.score,
                total_questions: a.totalQuestions,
                answers: a.answers,
                created_at: new Date(a.createdAt).toISOString(),
                demo_key: DEMO_KEY
            }));

            const { error: attemptError } = await supabase
                .from('attempts')
                .upsert(attemptsToInsert, { onConflict: 'id' });

            if (attemptError) throw attemptError;
        }

        return {
            success: true,
            message: `Successfully migrated ${localLessons.length} lessons and ${localAttempts.length} attempts to Cloud.`
        };

    } catch (error: any) {
        console.error('Migration failed:', error);
        return { success: false, message: `Migration failed: ${error.message}` };
    }
}
