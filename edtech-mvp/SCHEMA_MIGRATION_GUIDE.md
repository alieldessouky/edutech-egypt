# Schema Migration Guide (Fix 3)

## What is Fix 3?

**Fix 3 is the critical schema migration that enables your analytics dashboard to work reliably.**

Without this migration:
- ❌ Teacher dashboard shows incomplete or no student attempt data
- ❌ Can't track which specific questions students got wrong
- ❌ No per-student analytics (everything is anonymous)
- ❌ Can't generate class performance reports
- ❌ When schools ask "show me how my students performed," you have no clean data

With this migration:
- ✅ Full student tracking with proper identities
- ✅ Detailed per-question analytics (see which questions are hardest)
- ✅ Teacher can review each student's answers
- ✅ Class-wide performance metrics
- ✅ Export-ready data for school reports

---

## What Changed?

### Critical Fixes

| Issue | Before | After |
|-------|--------|-------|
| **Student Tracking** | Anonymous `student_name` text | Proper `students` table with UUIDs |
| **Question Analytics** | No per-question data | New `attempt_answers` table tracks each answer |
| **Foreign Keys** | Questions → Quizzes (wrong) | Questions → Lessons (correct) |
| **Lesson Content** | Missing podcast/Arabic fields | Added `simplified_arabic`, `podcast_script` |

### New Tables

1. **`students`** - Track students across sessions
   ```sql
   id UUID, class_id UUID, display_name TEXT, device_id TEXT
   ```

2. **`attempt_answers`** - Per-question analytics
   ```sql
   id UUID, attempt_id UUID, question_id UUID, selected_choice TEXT, is_correct BOOLEAN
   ```

### Modified Tables

1. **`lessons`** - Added content columns
   - `simplified_arabic TEXT`
   - `podcast_script TEXT`

2. **`questions`** - Changed foreign key
   - ~~`quiz_id UUID`~~ → `lesson_id UUID`

3. **`attempts`** - Changed student reference
   - ~~`student_name TEXT`~~ → `student_id UUID`

---

## Migration Options

### Option A: Fresh Start (Recommended for Development)

**Use this if:** You're in early development and don't have production data yet.

1. Open Supabase SQL Editor
2. Copy entire contents of `supabase_schema_v2.sql`
3. Run the script
4. Done! ✅

**Pros:**
- Clean, correct schema from the start
- No migration complexity
- Fastest option

**Cons:**
- Loses any existing data (classes, lessons, attempts)

---

### Option B: Safe Migration (Recommended for Production)

**Use this if:** You have existing data (lessons, classes, student attempts) you want to keep.

#### Step 1: Backup Your Data

```bash
# Export current data from Supabase Dashboard
# Go to: Database → Backups → Create Backup
```

#### Step 2: Run Migration Script

1. Open Supabase SQL Editor
2. Copy contents of `supabase_migration_v1_to_v2.sql`
3. Run the script
4. Check for errors in the output

#### Step 3: Verify Migration

Run this verification query:

```sql
SELECT 'Classes' as table_name, COUNT(*) as count FROM classes
UNION ALL
SELECT 'Lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 'Questions', COUNT(*) FROM questions
UNION ALL
SELECT 'Students', COUNT(*) FROM students
UNION ALL
SELECT 'Attempts', COUNT(*) FROM attempts
UNION ALL
SELECT 'Attempt Answers', COUNT(*) FROM attempt_answers;
```

Expected output:
- All tables should show their record counts
- No errors should appear

#### Step 4: Test Analytics Dashboard

1. Go to Teacher Portal → `/teacher`
2. Select a class
3. Click "Attempt Review"
4. Select a lesson
5. You should see student attempts with expandable details

**If you see errors:** Restore from backup and contact support.

---

## Post-Migration Checklist

After running the migration, verify these features work:

### Teacher Dashboard
- [ ] Can create a class
- [ ] Can add a lesson with questions
- [ ] Class stats show correct student count
- [ ] Class stats show correct attempt count
- [ ] Can select a lesson in "Attempt Review"
- [ ] Can see list of student attempts
- [ ] Can expand an attempt to see per-question details
- [ ] Per-question details show correct/incorrect status
- [ ] Per-question details show selected vs. correct answer

### Student Experience
- [ ] Can join a class via invite link
- [ ] Can see lessons for that class
- [ ] Can take a quiz
- [ ] Can submit quiz
- [ ] Results show immediately after submission
- [ ] "Focus Areas" shows missed questions
- [ ] Score calculation is accurate

### Data Integrity
- [ ] No duplicate students created
- [ ] All attempts link to correct students
- [ ] All questions link to correct lessons
- [ ] No orphaned records (foreign key violations)

---

## Troubleshooting

### Error: "relation 'students' does not exist"

**Solution:** Run `supabase_migration_v1_to_v2.sql` first, then retry.

### Error: "column 'student_id' does not exist"

**Solution:** The migration didn't complete. Check SQL Editor for errors and re-run the migration.

### Students can join but can't see lessons

**Solution:**
1. Check that lessons have `class_id` set correctly
2. Run: `SELECT * FROM lessons WHERE class_id IS NULL;`
3. If results exist, update them: `UPDATE lessons SET class_id = '<your_class_id>' WHERE class_id IS NULL;`

### Teacher sees 0 attempts but students submitted quizzes

**Possible causes:**
1. **student_id not set on attempts:** Run migration again
2. **Mismatched class_id:** Verify lessons and students are in same class
3. **Frontend issue:** Check browser console for errors

**Debug query:**
```sql
SELECT
    a.id,
    a.created_at,
    s.display_name,
    l.title as lesson_title
FROM attempts a
LEFT JOIN students s ON a.student_id = s.id
LEFT JOIN lessons l ON a.lesson_id = l.id
ORDER BY a.created_at DESC
LIMIT 20;
```

Should show recent attempts with student names and lesson titles.

### Attempt details don't expand (no per-question data)

**Cause:** `attempt_answers` table is empty.

**Solution:** This is expected for attempts created before migration. New attempts (created after migration) will populate this table automatically.

To test: Have a student take a new quiz, then check teacher dashboard.

---

## Technical Details

### Why Questions Link to Lessons (Not Quizzes)

**Original plan:** `Lessons → Quizzes → Questions` (3-tier hierarchy)

**Current implementation:** `Lessons → Questions` (2-tier hierarchy)

The code was written expecting questions to link directly to lessons. While a 3-tier hierarchy is architecturally cleaner, it requires significant code changes across:
- Student quiz rendering
- Teacher question creation
- Analytics queries
- Attempt tracking

The migration chose pragmatism: **match the schema to the working code**, not the other way around.

**Future:** You can evolve to a 3-tier model later if needed (quizzes table still exists for forward compatibility).

### Why student_id Instead of student_name

**Before:**
```typescript
attempts.student_name = "Ahmed Mohamed" // Just text
```

**After:**
```typescript
students.id = uuid // Unique identifier
attempts.student_id = uuid // Foreign key reference
```

**Benefits:**
1. Students can change their name without losing history
2. Prevents duplicate tracking ("Ahmed" vs "Ahmed Mohamed")
3. Enables relational queries (JOIN students)
4. Required for `attempt_answers` foreign key

---

## FAQ

**Q: Will this migration break existing code?**
A: No. The migration adds new tables and columns without removing old ones (e.g., `student_name` stays for backward compat).

**Q: Do I need to update my frontend code?**
A: No, but you should. The current student join flow ([app/c/[classId]/page.tsx](app/c/[classId]/page.tsx)) already expects the new schema.

**Q: Can I roll back if something goes wrong?**
A: Yes, if you created a backup. Restore via Supabase Dashboard → Backups.

**Q: How long does migration take?**
A: ~1-5 seconds for databases with <1000 records. May take longer for larger datasets.

**Q: Will my app go down during migration?**
A: No. The migration is additive (adds new stuff) and uses transactions (atomic). Your app stays running.

---

## Next Steps After Migration

1. **Test thoroughly** using the checklist above
2. **Document any issues** you encounter
3. **Monitor analytics dashboard** for a few days
4. **Update DEVELOPMENT_LOG.md** to mark Fix 3 as complete
5. **Create sample class + lessons** to demo for schools

---

## Support

If you encounter issues not covered in this guide:

1. Check Supabase SQL Editor for detailed error messages
2. Verify table structures: `\d+ students` (PostgreSQL command)
3. Review application logs in browser console
4. Check server logs: `npm run dev` output

---

**Last Updated:** 2026-02-22
**Schema Version:** V2
**Status:** Production Ready ✅
