-- Connect to Supabase SQL editor and run this:
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS pdf_page_start INTEGER DEFAULT 1;