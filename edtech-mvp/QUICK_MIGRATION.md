# Quick Migration Reference

## TL;DR - Fix 3 in 60 Seconds

### Fresh Database (No Existing Data)

```bash
1. Open Supabase SQL Editor
2. Copy/paste: supabase_schema_v2.sql
3. Click "Run"
4. Done ✅
```

### Existing Database (Has Data)

```bash
1. Backup: Supabase → Database → Backups → Create
2. Open SQL Editor
3. Copy/paste: supabase_migration_v1_to_v2.sql
4. Click "Run"
5. Verify: See checklist below
```

## Verification Checklist (2 Minutes)

### Quick Test
```sql
-- Run this in SQL Editor
SELECT
  (SELECT COUNT(*) FROM students) as students,
  (SELECT COUNT(*) FROM attempt_answers) as answers,
  (SELECT COUNT(*) FROM questions WHERE lesson_id IS NOT NULL) as questions_linked;
```

**Expected:**
- `students` > 0 (if you had attempts)
- `questions_linked` = total question count
- No errors

### Full Test
1. Go to `/teacher`
2. Create test class
3. Create test lesson with 2 questions
4. Share class link
5. Join as student (incognito window)
6. Take quiz
7. Go back to teacher dashboard
8. Click "Attempt Review"
9. Select your test lesson
10. Click the attempt to expand

**Expected:** You see question-by-question breakdown

## What This Fixes

| Problem | Solution |
|---------|----------|
| Teacher can't see student details | ✅ Added `students` table |
| No per-question analytics | ✅ Added `attempt_answers` table |
| Questions won't load | ✅ Fixed `questions.lesson_id` FK |
| Podcast scripts missing | ✅ Added lesson columns |

## Rollback Plan

```sql
-- If something goes wrong:
1. Supabase Dashboard → Backups
2. Find your pre-migration backup
3. Click "Restore"
4. Confirm
```

## Common Errors

**Error:** `column "lesson_id" does not exist`
**Fix:** You're on old schema. Run `supabase_migration_v1_to_v2.sql`

**Error:** `relation "students" does not exist`
**Fix:** Migration didn't run. Check SQL Editor errors.

**Error:** Teacher dashboard shows 0 attempts
**Fix:** Run this to verify data exists:
```sql
SELECT COUNT(*) FROM attempts;
```
If count > 0 but dashboard shows 0, clear browser cache and refresh.

## Files Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `supabase_schema_v2.sql` | Clean schema | Fresh project |
| `supabase_migration_v1_to_v2.sql` | Migrate existing data | Production |
| `SCHEMA_MIGRATION_GUIDE.md` | Full docs | Troubleshooting |
| `QUICK_MIGRATION.md` | This file | Quick ref |

## Support Queries

**Show all students:**
```sql
SELECT id, display_name, created_at FROM students ORDER BY created_at DESC;
```

**Show recent attempts with details:**
```sql
SELECT
  s.display_name,
  l.title,
  a.score,
  a.created_at
FROM attempts a
JOIN students s ON a.student_id = s.id
JOIN lessons l ON a.lesson_id = l.id
ORDER BY a.created_at DESC
LIMIT 10;
```

**Show per-question analytics:**
```sql
SELECT
  q.question,
  aa.selected_choice,
  aa.is_correct,
  s.display_name
FROM attempt_answers aa
JOIN questions q ON aa.question_id = q.id
JOIN attempts a ON aa.attempt_id = a.id
JOIN students s ON a.student_id = s.id
LIMIT 20;
```

---

**Questions?** See full guide: [SCHEMA_MIGRATION_GUIDE.md](./SCHEMA_MIGRATION_GUIDE.md)
