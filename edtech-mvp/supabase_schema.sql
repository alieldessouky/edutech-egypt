
-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Classes Table (Organizational Layer)
-- Allows grouping lessons by class/grade/subject combination
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Lessons Table Update (or Re-creation if experimental)
-- Assuming we are altering or creating new for the Mission Plan.
-- To be safe given "MVP" status, I will provide CREATE statements that are idempotent-ish or meant for fresh setup/migration.

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    subject TEXT DEFAULT 'General',
    grade INTEGER CHECK (grade >= 1 AND grade <= 12),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Quizzes Table (New Intermediate Layer)
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Quiz',
    passing_score INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Questions Table (Update to link to Quizzes instead of Lessons)
-- If table exists, we might need to migrate data, but for this plan we define the target state.
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    choices JSONB NOT NULL, -- Array of strings
    correct_index INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Attempts Table (Update to link to Quizzes if tracking per quiz, or keep lesson_id if tracking per lesson?
-- The plan mentions "Quiz table", usually attempts are per quiz. 
-- However, keeping it simple for now, we might link to quiz_id.
-- But the existing code uses lesson_id. Let's stick to lesson_id for "Lesson Completion" or switch to quiz_id.
-- Given the "Lesson -> Quiz" hierarchy, a lesson might have multiple quizzes.
-- Let's add quiz_id to attempts, make lesson_id optional or keep it for easy querying.
-- For this MVP step, I will add quiz_id to attempts.

CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name TEXT NOT NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE, -- Kept for backward compat/analytics
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE, -- New
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answers JSONB,
    demo_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
