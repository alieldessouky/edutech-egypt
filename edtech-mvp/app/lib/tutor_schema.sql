-- Create tutor_sessions table
CREATE TABLE IF NOT EXISTS tutor_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES auth.users(id),
    lesson_id uuid REFERENCES lessons(id),
    messages jsonb DEFAULT '[]',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
-- Add audio columns to lessons
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS summary_audio_url text;
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS key_points_audio_url text;
-- RLS Policies
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;
-- Note: You might need to drop existing policies if they exist to avoid conflicts, 
-- or use DO blocks, but simple creation is usually fine for MVP if not existing.
-- Policy: Students can manage their own sessions
CREATE POLICY "Student CRUD own sessions" ON tutor_sessions FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
-- Policy: Teachers can view sessions for their lessons
CREATE POLICY "Teacher view sessions for their lessons" ON tutor_sessions FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM lessons
            WHERE lessons.id = tutor_sessions.lesson_id
                AND lessons.created_by = auth.uid()
        )
    );
-- Indexes
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_student_id ON tutor_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_lesson_id ON tutor_sessions(lesson_id);