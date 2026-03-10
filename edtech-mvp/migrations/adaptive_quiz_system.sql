-- Migration: Adaptive Quiz System with Gamification
-- Description: Adds adaptive difficulty, varied question types, and gamification features
-- Date: 2026-03-03

-- =======================
-- NEW TABLES
-- =======================

-- Student Progress: Tracks adaptive difficulty progression per student per lesson
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    -- Current difficulty level for this student on this lesson
    current_difficulty TEXT DEFAULT 'easy' CHECK (current_difficulty IN ('easy', 'medium', 'hard')),

    -- Performance tracking per difficulty level
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

CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_lesson_id ON student_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_difficulty ON student_progress(current_difficulty);


-- Achievements: Badge/achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,  -- Emoji or icon identifier
    category TEXT,  -- 'milestone', 'streak', 'mastery', 'special'
    points INTEGER DEFAULT 0,
    criteria JSONB,  -- Flexible unlock criteria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_achievements_code ON achievements(code);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);


-- Student Achievements: Earned badges
CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

    UNIQUE(student_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_earned_at ON student_achievements(earned_at DESC);


-- Student Stats: Aggregate statistics for personal progress
CREATE TABLE IF NOT EXISTS student_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,

    total_points INTEGER DEFAULT 0,
    total_quizzes INTEGER DEFAULT 0,
    total_questions_answered INTEGER DEFAULT 0,
    total_correct_answers INTEGER DEFAULT 0,

    -- Streak tracking
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,

    achievement_count INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

    CHECK (current_streak >= 0),
    CHECK (longest_streak >= 0),
    CHECK (level >= 1)
);

CREATE INDEX IF NOT EXISTS idx_student_stats_student_id ON student_stats(student_id);
CREATE INDEX IF NOT EXISTS idx_student_stats_points ON student_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_student_stats_streak ON student_stats(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_student_stats_level ON student_stats(level DESC);


-- =======================
-- ALTER EXISTING TABLES
-- =======================

-- Questions: Add difficulty, question type, type-specific data, and points
ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'fill_blank', 'matching')),
    ADD COLUMN IF NOT EXISTS type_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10 CHECK (points >= 0);

CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_difficulty ON questions(quiz_id, difficulty);


-- Attempts: Track difficulty and points earned
ALTER TABLE attempts
    ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'easy',
    ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0);

CREATE INDEX IF NOT EXISTS idx_attempts_difficulty ON attempts(difficulty);


-- Attempt Answers: Store flexible answer data and points per answer
ALTER TABLE attempt_answers
    ADD COLUMN IF NOT EXISTS answer_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0);


-- =======================
-- SEED DATA: ACHIEVEMENTS
-- =======================

-- Milestone-focused achievements (not competitive)
INSERT INTO achievements (code, name, description, icon, category, points, criteria) VALUES
    ('first_quiz', 'First Steps', 'Complete your first quiz', '🎯', 'milestone', 10, '{"type":"quiz_count","value":1}'),
    ('perfect_score', 'Perfect!', 'Get 100% on any quiz', '💯', 'mastery', 50, '{"type":"perfect_score"}'),
    ('streak_3', '3-Day Streak', 'Learn 3 days in a row', '🔥', 'streak', 30, '{"type":"streak","value":3}'),
    ('streak_7', 'Week Warrior', 'Learn 7 days in a row', '⚡', 'streak', 100, '{"type":"streak","value":7}'),
    ('streak_14', 'Two Week Champion', 'Learn 14 days in a row', '🌟', 'streak', 250, '{"type":"streak","value":14}'),
    ('easy_master', 'Easy Conqueror', 'Master all easy levels', '⭐', 'mastery', 75, '{"type":"difficulty_master","level":"easy"}'),
    ('medium_master', 'Challenge Seeker', 'Master all medium levels', '🌟', 'mastery', 150, '{"type":"difficulty_master","level":"medium"}'),
    ('hard_master', 'Legend', 'Master all hard levels', '👑', 'mastery', 300, '{"type":"difficulty_master","level":"hard"}'),
    ('variety_lover', 'Variety Star', 'Answer all 4 question types', '🎨', 'milestone', 40, '{"type":"question_types","value":4}'),
    ('quick_learner', 'Quick Learner', 'Complete 5 quizzes', '🚀', 'milestone', 50, '{"type":"quiz_count","value":5}'),
    ('dedicated_student', 'Dedicated Student', 'Complete 20 quizzes', '📚', 'milestone', 200, '{"type":"quiz_count","value":20}')
ON CONFLICT (code) DO NOTHING;


-- =======================
-- MIGRATION: EXISTING DATA
-- =======================

-- Migrate existing questions to have default difficulty and type
-- All existing questions default to 'easy' MCQ with 10 points
UPDATE questions
SET
    difficulty = 'easy',
    question_type = 'mcq',
    points = 10,
    type_data = jsonb_build_object(
        'choices', choices,
        'correctIndex', correct_index
    )
WHERE difficulty IS NULL AND question_type IS NULL;

-- Migrate existing attempts to have default difficulty
UPDATE attempts
SET difficulty = 'easy'
WHERE difficulty IS NULL;


-- =======================
-- HELPER FUNCTIONS
-- =======================

-- Function: Calculate student level based on total points
CREATE OR REPLACE FUNCTION calculate_student_level(total_points INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Level 1: 0-100 points
    -- Level 2: 101-250 points
    -- Level 3: 251-500 points
    -- Level 4: 501-1000 points
    -- Level 5+: Every 500 points

    IF total_points <= 100 THEN
        RETURN 1;
    ELSIF total_points <= 250 THEN
        RETURN 2;
    ELSIF total_points <= 500 THEN
        RETURN 3;
    ELSIF total_points <= 1000 THEN
        RETURN 4;
    ELSE
        RETURN 5 + FLOOR((total_points - 1000) / 500);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Function: Auto-update student level when points change
CREATE OR REPLACE FUNCTION update_student_level()
RETURNS TRIGGER AS $$
BEGIN
    NEW.level = calculate_student_level(NEW.total_points);
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update level on student_stats changes
DROP TRIGGER IF EXISTS trigger_update_student_level ON student_stats;
CREATE TRIGGER trigger_update_student_level
BEFORE UPDATE OF total_points ON student_stats
FOR EACH ROW
EXECUTE FUNCTION update_student_level();


-- =======================
-- COMMENTS
-- =======================

COMMENT ON TABLE student_progress IS 'Tracks each student adaptive difficulty progression per lesson';
COMMENT ON TABLE achievements IS 'Defines all available achievements/badges students can earn';
COMMENT ON TABLE student_achievements IS 'Records which achievements each student has unlocked';
COMMENT ON TABLE student_stats IS 'Aggregates student statistics for gamification and progress tracking';

COMMENT ON COLUMN questions.difficulty IS 'Question difficulty: easy (10pts), medium (20pts), hard (40pts)';
COMMENT ON COLUMN questions.question_type IS 'Type of question: mcq, true_false, fill_blank, matching';
COMMENT ON COLUMN questions.type_data IS 'Question type-specific data stored as JSONB for flexibility';
COMMENT ON COLUMN questions.points IS 'Points awarded for correct answer (typically 10/20/40 based on difficulty)';

COMMENT ON COLUMN student_progress.current_difficulty IS 'Current difficulty level student is working on for this lesson';
COMMENT ON COLUMN student_progress.easy_mastered IS 'True if student achieved 80%+ on easy with min 5 questions';

-- =======================
-- VERIFICATION QUERIES
-- =======================

-- Verify table creation
DO $$
BEGIN
    RAISE NOTICE 'Migration complete. Verifying...';

    -- Check tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_progress') THEN
        RAISE NOTICE '✓ student_progress table created';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievements') THEN
        RAISE NOTICE '✓ achievements table created';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_achievements') THEN
        RAISE NOTICE '✓ student_achievements table created';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_stats') THEN
        RAISE NOTICE '✓ student_stats table created';
    END IF;

    -- Check achievement count
    RAISE NOTICE '✓ Achievements seeded: % rows', (SELECT COUNT(*) FROM achievements);
END $$;
