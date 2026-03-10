-- Clean Migration: Handles Existing Tables
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Clean Up Existing Tables (if any)
-- ============================================

DROP TABLE IF EXISTS student_achievements CASCADE;
DROP TABLE IF EXISTS student_stats CASCADE;
DROP TABLE IF EXISTS student_progress CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- ============================================
-- PART 2: Create Fresh Tables
-- ============================================

-- Students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create default student for MVP
INSERT INTO students (id, name, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Student Default', 'student-default@example.com')
ON CONFLICT (id) DO NOTHING;

-- Lessons table
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    subject TEXT,
    grade INTEGER,
    simplified_arabic TEXT,
    podcast_script TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Quizzes table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Questions table (enhanced for adaptive system)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    choices TEXT[] DEFAULT '{}',
    correct_index INTEGER,
    image_url TEXT,

    -- New fields for adaptive quiz system
    difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_type TEXT DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'fill_blank', 'matching')),
    type_data JSONB,
    points INTEGER DEFAULT 10,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_quiz_difficulty ON questions(quiz_id, difficulty);

-- Attempts table (enhanced)
CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name TEXT,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    answers JSONB,
    score INTEGER,
    total_questions INTEGER,

    -- New fields for adaptive system
    difficulty TEXT DEFAULT 'easy',
    points_earned INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_attempts_lesson_id ON attempts(lesson_id);
CREATE INDEX idx_attempts_created_at ON attempts(created_at DESC);

-- ============================================
-- PART 3: Adaptive Quiz System Tables
-- ============================================

-- Student Progress: Tracks adaptive difficulty progression
CREATE TABLE student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    current_difficulty TEXT DEFAULT 'easy' CHECK (current_difficulty IN ('easy', 'medium', 'hard')),

    easy_correct INTEGER DEFAULT 0,
    easy_total INTEGER DEFAULT 0,
    easy_mastered BOOLEAN DEFAULT false,

    medium_correct INTEGER DEFAULT 0,
    medium_total INTEGER DEFAULT 0,
    medium_mastered BOOLEAN DEFAULT false,

    hard_correct INTEGER DEFAULT 0,
    hard_total INTEGER DEFAULT 0,
    hard_mastered BOOLEAN DEFAULT false,

    last_attempt_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

    UNIQUE(student_id, lesson_id)
);

CREATE INDEX idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX idx_student_progress_lesson_id ON student_progress(lesson_id);

-- Achievements: Badge definitions
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    points INTEGER DEFAULT 0,
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_achievements_code ON achievements(code);

-- Student Achievements: Earned badges
CREATE TABLE student_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, achievement_id)
);

CREATE INDEX idx_student_achievements_student_id ON student_achievements(student_id);

-- Student Stats: Aggregate statistics
CREATE TABLE student_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
    total_points INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    total_questions_answered INTEGER DEFAULT 0,
    total_correct_answers INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    achievement_count INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_student_stats_student_id ON student_stats(student_id);
CREATE INDEX idx_student_stats_points ON student_stats(total_points DESC);
CREATE INDEX idx_student_stats_level ON student_stats(level DESC);

-- ============================================
-- PART 4: Seed Initial Achievements
-- ============================================

INSERT INTO achievements (code, name, description, icon, category, points, criteria) VALUES
('first_quiz', 'First Steps', 'Complete your first quiz', '🎯', 'milestone', 10, '{"type": "quiz_count", "value": 1}'),
('perfect_score', 'Perfect!', 'Get 100% on any quiz', '💯', 'mastery', 50, '{"type": "perfect_score"}'),
('streak_3', '3-Day Streak', 'Study for 3 consecutive days', '🔥', 'streak', 30, '{"type": "streak", "value": 3}'),
('streak_7', 'Week Warrior', 'Study for 7 consecutive days', '⚡', 'streak', 100, '{"type": "streak", "value": 7}'),
('streak_14', 'Two Week Champion', 'Study for 14 consecutive days', '🌟', 'streak', 250, '{"type": "streak", "value": 14}'),
('easy_master', 'Easy Conqueror', 'Master all easy questions', '⭐', 'mastery', 75, '{"type": "difficulty_master", "level": "easy"}'),
('medium_master', 'Challenge Seeker', 'Master all medium questions', '🌟', 'mastery', 150, '{"type": "difficulty_master", "level": "medium"}'),
('hard_master', 'Legend', 'Master all hard questions', '👑', 'mastery', 300, '{"type": "difficulty_master", "level": "hard"}'),
('variety_lover', 'Variety Star', 'Answer all 4 question types', '🎨', 'milestone', 40, '{"type": "question_types", "value": 4}'),
('quick_learner', 'Quick Learner', 'Complete 5 quizzes', '🚀', 'milestone', 50, '{"type": "quiz_count", "value": 5}'),
('dedicated_student', 'Dedicated Student', 'Complete 20 quizzes', '📚', 'milestone', 200, '{"type": "quiz_count", "value": 20}')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- PART 5: Helper Functions
-- ============================================

-- Function to calculate student level from points
CREATE OR REPLACE FUNCTION calculate_student_level(points INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF points <= 100 THEN RETURN 1;
    ELSIF points <= 250 THEN RETURN 2;
    ELSIF points <= 500 THEN RETURN 3;
    ELSIF points <= 1000 THEN RETURN 4;
    ELSE RETURN 5 + FLOOR((points - 1000) / 500);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update level when points change
CREATE OR REPLACE FUNCTION trigger_update_student_level()
RETURNS TRIGGER AS $$
BEGIN
    NEW.level = calculate_student_level(NEW.total_points);
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_level ON student_stats;
CREATE TRIGGER update_student_level
    BEFORE INSERT OR UPDATE OF total_points ON student_stats
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_student_level();

-- ============================================
-- Setup complete! Your database is ready.
-- ============================================
