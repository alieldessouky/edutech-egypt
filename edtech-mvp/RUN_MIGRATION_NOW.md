# Run Migration Now - Copy & Paste Guide

## Choose Your Scenario

### 🆕 Scenario A: Fresh Database (No Existing Data)

**Use this if:**
- You just started the project
- You're setting up a new Supabase project
- You're okay deleting all existing data

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the ENTIRE file `supabase_schema_v2.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Wait for "Success"
6. Done! ✅

**Time:** 10 seconds

---

### 🔄 Scenario B: Existing Database (Preserve Data)

**Use this if:**
- You have existing classes, lessons, or attempts
- You're in production
- You need to keep all data

**Steps:**

#### 1️⃣ Backup (30 seconds)

```
Supabase Dashboard
  → Database (left sidebar)
  → Backups (tab)
  → "Create Backup" button
  → Wait for green checkmark
```

#### 2️⃣ Run Migration (30 seconds)

```
Supabase Dashboard
  → SQL Editor (left sidebar)
  → New Query
  → Copy ENTIRE file: supabase_migration_v1_to_v2.sql
  → Paste
  → Click "Run"
  → Wait for "Success"
```

#### 3️⃣ Verify (30 seconds)

Run this query in SQL Editor:

```sql
SELECT
  (SELECT COUNT(*) FROM classes) as classes,
  (SELECT COUNT(*) FROM lessons) as lessons,
  (SELECT COUNT(*) FROM questions) as questions,
  (SELECT COUNT(*) FROM students) as students,
  (SELECT COUNT(*) FROM attempts) as attempts,
  (SELECT COUNT(*) FROM attempt_answers) as answers;
```

**Expected:** Numbers match your data (not all zeros)

#### 4️⃣ Test (2 minutes)

1. Go to `/teacher`
2. Create a test class
3. Create a test lesson with 2 questions
4. Copy class invite link
5. Open in incognito tab
6. Join as "Test Student"
7. Take the quiz
8. Go back to teacher tab
9. Refresh page
10. Click "Attempt Review"
11. Select your test lesson
12. Click the attempt to expand

**Expected:** You see question-by-question breakdown

**If all good:** Migration successful! 🎉

**If errors:** Go to step 5

#### 5️⃣ Rollback (if needed)

```
Supabase Dashboard
  → Database
  → Backups
  → Find your backup (timestamp)
  → Click "⋯" menu
  → "Restore"
  → Confirm
  → Wait 30 seconds
```

---

## Common Issues

### ❌ Error: "column already exists"

**Meaning:** You already ran the migration (or part of it)

**Fix:** This is fine! The migration is idempotent (safe to run multiple times). Ignore this error.

### ❌ Error: "relation already exists"

**Meaning:** Table already created

**Fix:** This is fine! Skip to verification step.

### ❌ Error: "null value in column violates not-null constraint"

**Meaning:** Some data is missing required fields

**Fix:**
1. Check which table: Read error message for table name
2. If `students`: Normal, migration will create them
3. If `attempts`: Run this first:
   ```sql
   DELETE FROM attempts WHERE student_name IS NULL;
   ```
4. Re-run migration

### ❌ Teacher dashboard shows 0 attempts (but query shows data)

**Fix:**
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
3. Re-login to teacher portal

---

## Verification Queries

### Check Students Created from Attempts

```sql
SELECT
  s.display_name,
  COUNT(a.id) as attempt_count
FROM students s
LEFT JOIN attempts a ON a.student_id = s.id
GROUP BY s.display_name
ORDER BY attempt_count DESC;
```

**Expected:** List of student names with their attempt counts

### Check Questions Linked to Lessons

```sql
SELECT
  l.title as lesson_title,
  COUNT(q.id) as question_count
FROM lessons l
LEFT JOIN questions q ON q.lesson_id = l.id
GROUP BY l.title
ORDER BY question_count DESC;
```

**Expected:** Lessons with their question counts

### Check Attempt Answers Populated

```sql
SELECT
  s.display_name,
  q.question,
  aa.selected_choice,
  aa.is_correct
FROM attempt_answers aa
JOIN attempts a ON aa.attempt_id = a.id
JOIN students s ON a.student_id = s.id
JOIN questions q ON aa.question_id = q.id
ORDER BY a.created_at DESC
LIMIT 10;
```

**Expected:** Recent quiz answers with student names

**If empty:** Normal for old attempts. Take a new quiz to populate.

---

## Post-Migration Checklist

- [ ] Backup created
- [ ] Migration script ran without errors
- [ ] Verification query shows data
- [ ] Teacher can create class
- [ ] Teacher can add lesson
- [ ] Student can join class
- [ ] Student can take quiz
- [ ] Teacher sees attempt in dashboard
- [ ] Teacher can expand attempt details
- [ ] Per-question breakdown shows correctly

**All checked?** You're done! 🎉

---

## Need Help?

1. **Quick issues:** Check `QUICK_MIGRATION.md`
2. **Deep dive:** Read `SCHEMA_MIGRATION_GUIDE.md`
3. **Visual reference:** See `SCHEMA_DIAGRAM.md`
4. **Stuck?** Run verification queries above and check output

---

## Summary

**Fresh database:**
→ Run `supabase_schema_v2.sql`
→ Test
→ Done (10 sec)

**Existing database:**
→ Backup
→ Run `supabase_migration_v1_to_v2.sql`
→ Verify
→ Test
→ Done (2 min)

**Next:** Start demoing your analytics dashboard to schools! 🚀
