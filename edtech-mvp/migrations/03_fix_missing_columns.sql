-- Migration 03: Fix Missing Columns
-- Adds demo_key, subject, and grade columns to existing tables without dropping them.
-- 1. Add demo_key to attempts
ALTER TABLE attempts
ADD COLUMN IF NOT EXISTS demo_key TEXT DEFAULT 'demo';
-- 2. Add subject and grade to lessons
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'General';
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS grade INTEGER DEFAULT 1;
-- 3. Add point tracking to attempt_answers if missing
ALTER TABLE attempt_answers
ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
-- 4. Ensure student_stats has level tracking
ALTER TABLE student_stats
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
-- 5. Fix device_id nullable constraint if needed (from Phase 3 notes)
-- Skipping: device_id does not exist on this table yet
-- 6. Add indexes for performance (if they were missed)
CREATE INDEX IF NOT EXISTS idx_attempts_demo_key ON attempts(demo_key);
CREATE INDEX IF NOT EXISTS idx_lessons_grade ON lessons(grade);
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject);
-- ============================================
-- ✅ Migration Complete!
-- ============================================