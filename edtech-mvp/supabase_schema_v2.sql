-- ═══════════════════════════════════════════════════════════════════════════
-- EdTech Egypt - Complete Schema Migration V2
-- ═══════════════════════════════════════════════════════════════════════════
-- This schema fixes critical issues preventing analytics from working:
-- 1. Adds missing `students` table for proper student tracking
-- 2. Adds missing `attempt_answers` table for detailed quiz analytics
-- 3. Corrects foreign key relationships to match application code
-- 4. Adds missing columns for lesson content (podcast, simplified Arabic)
-- ═══════════════════════════════════════════════════════════════════════════
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ORGANIZATIONAL LAYER
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Classes: Organizational layer for grouping lessons by classroom
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
-- Students: Individual students who join classes and take quizzes
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE
    SET NULL,
        display_name TEXT NOT NULL,
        device_id TEXT,
        -- Optional: for tracking across sessions
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CONTENT LAYER
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Lessons: Core educational content with metadata
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE
    SET NULL,
        title TEXT NOT NULL,
        content TEXT,
        -- Main lesson content
        simplified_arabic TEXT,
        -- Simplified Arabic version for students
        podcast_script TEXT,
        -- Text-to-speech script for audio lessons
        subject TEXT DEFAULT 'General',
        grade INTEGER CHECK (
            grade >= 1
            AND grade <= 12
        ),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
-- Questions: Quiz questions linked DIRECTLY to quizzes
-- NOTE: Questions link to quizzes to support adaptive learning (Easy/Medium/Hard versions)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    choices JSONB NOT NULL,
    -- Array of choice strings: ["Choice 1", "Choice 2", ...]
    correct_index INTEGER NOT NULL,
    -- 0-based index of correct choice
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
-- Quizzes: Optional intermediate layer (kept for future use)
-- NOTE: Currently not used in main flow, but kept for backward compatibility
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Quiz',
    passing_score INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ANALYTICS LAYER (Critical for teacher dashboard)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Attempts: Student quiz submission records
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE
    SET NULL,
        -- Optional, for future use
        score INTEGER NOT NULL,
        -- Raw count of correct answers
        total_questions INTEGER,
        -- For validation
        answers JSONB,
        -- Legacy: Map of question index to selected choice index
        demo_key TEXT,
        -- For multi-tenant isolation
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
-- Attempt Answers: Detailed per-question analytics
-- This table is CRITICAL for showing teachers which questions students missed
CREATE TABLE IF NOT EXISTS attempt_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_choice TEXT,
    -- Actual text of selected choice (for display)
    is_correct BOOLEAN NOT NULL,
    short_answer TEXT,
    -- For future free-text questions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INDEXES FOR PERFORMANCE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Index for fetching lessons by class
CREATE INDEX IF NOT EXISTS idx_lessons_class_id ON lessons(class_id);
-- Index for fetching questions by quiz
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
-- Index for fetching students by class
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
-- Index for fetching attempts by student
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON attempts(student_id);
-- Index for fetching attempts by lesson (for analytics)
CREATE INDEX IF NOT EXISTS idx_attempts_lesson_id ON attempts(lesson_id);
-- Index for fetching attempt answers by attempt
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON attempt_answers(attempt_id);
-- Index for demo key filtering
CREATE INDEX IF NOT EXISTS idx_attempts_demo_key ON attempts(demo_key);
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION NOTES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- IF YOU HAVE EXISTING DATA:
--
-- 1. Run this schema on a FRESH Supabase project, OR
-- 2. Use the migration script below to preserve existing data
--
-- To migrate existing data:
--
-- A. Add missing columns to existing tables:
--    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS simplified_arabic TEXT;
--    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS podcast_script TEXT;
--
-- B. Ensure questions remain linked to quizzes:
--    (No action needed for questions, they already use quiz_id)
--    Make sure attempts have quiz_id linked if missing.
--
-- C. Create default students for existing attempts:
--    INSERT INTO students (id, display_name, created_at)
--    SELECT
--        uuid_generate_v4(),
--        DISTINCT student_name,
--        MIN(created_at)
--    FROM attempts
--    WHERE student_name IS NOT NULL
--    GROUP BY student_name;
--
-- D. Link attempts to students:
--    UPDATE attempts a
--    SET student_id = (SELECT id FROM students WHERE display_name = a.student_name)
--    WHERE student_name IS NOT NULL;
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━