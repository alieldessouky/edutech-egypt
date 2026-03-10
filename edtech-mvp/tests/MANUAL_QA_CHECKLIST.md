# Manual QA Checklist - Adaptive Quiz System

**Tester Name:** ___________________
**Date:** ___________________
**Build/Version:** ___________________
**Browser:** ___________________
**Device:** Desktop / Mobile (Circle one)

---

## 🎯 Part 1: Question Types (All Types)

### MCQ (Multiple Choice)
- [ ] Question displays with 4 choices
- [ ] Choices are clickable/selectable
- [ ] Only one choice can be selected at a time
- [ ] Correct answer marked properly after submission
- [ ] Works on mobile (touch)
- [ ] Works on desktop (click)

### True/False
- [ ] Two large buttons displayed ("صح" / "خطأ")
- [ ] Buttons are easily tappable on mobile
- [ ] Selection highlighted before submit
- [ ] Grading correct (True marked correctly)
- [ ] Grading correct (False marked correctly)

### Fill-in-the-Blank
- [ ] Input field displayed with placeholder
- [ ] Accepts Arabic numerals (e.g., ١٩١٩)
- [ ] Accepts English numerals (e.g., 1919)
- [ ] Case insensitive matching works
- [ ] Leading/trailing spaces ignored
- [ ] Hint button works (if implemented)
- [ ] Correct answers accepted properly

### Matching
- [ ] All pairs displayed clearly
- [ ] Drag-and-drop works (desktop)
- [ ] Selection/dropdown works (mobile)
- [ ] Partial credit calculated if enabled
- [ ] All correct gives full points
- [ ] Visual feedback for matching

**Notes/Issues:**
```

```

---

## 📊 Part 2: Adaptive Difficulty System

### Difficulty Progression
- [ ] New students start at "Easy" level
- [ ] Easy badge shows: ⭐ سهل (green)
- [ ] After 80% accuracy + 5 questions: "Easy Mastered!" message
- [ ] Next quiz shows "Medium" difficulty
- [ ] Medium badge shows: ⭐⭐ متوسط (yellow)
- [ ] After mastering medium: "Hard" unlocked
- [ ] Hard badge shows: ⭐⭐⭐ صعب (red)
- [ ] Cannot skip difficulty levels

### Mastery Criteria
- [ ] 80% accuracy required for mastery
- [ ] Minimum 5 questions required
- [ ] 4/5 correct (80%) does NOT master (needs 5+ total)
- [ ] 8/10 correct (80%) DOES master
- [ ] Progress saved correctly in database
- [ ] Refreshing page preserves difficulty level

**Test Case:** Complete 2 easy quizzes at 100%
- [ ] First quiz: Stays at easy
- [ ] Second quiz: Shows "Easy Mastered!" message
- [ ] Third quiz: Shows medium difficulty badge

**Notes/Issues:**
```

```

---

## 🎮 Part 3: Gamification Features

### Points System
- [ ] Easy question = 10 points
- [ ] Medium question = 20 points
- [ ] Hard question = 40 points
- [ ] Perfect score bonus = +50 points
- [ ] First attempt bonus = +10 points (if applicable)
- [ ] Points displayed during quiz
- [ ] Points updated in student stats

### Achievements
- [ ] "First Quiz" unlocks after 1 quiz
- [ ] "Perfect Score" unlocks after 100% quiz
- [ ] "3-Day Streak" unlocks after 3 consecutive days
- [ ] "7-Day Streak" unlocks after 7 consecutive days
- [ ] Achievement modal appears with animation
- [ ] Achievement gallery shows earned badges
- [ ] Locked achievements greyed out
- [ ] No duplicate achievement awards

### Streaks
- [ ] First day activity: streak = 1
- [ ] Consecutive day: streak increments
- [ ] Same day: streak stays same (no double count)
- [ ] Missed day: streak resets to 1
- [ ] Longest streak tracked correctly
- [ ] Streak displayed with 🔥 emoji

### Levels
- [ ] Level 1: 0-100 points
- [ ] Level 2: 101-250 points
- [ ] Level 3: 251-500 points
- [ ] Level up notification appears
- [ ] Level displayed on dashboard

**Notes/Issues:**
```

```

---

## ✨ Part 4: Animations & Visual Feedback

### Answer Feedback
- [ ] Correct answer: Green background fade-in
- [ ] Correct answer: Checkmark (✓) rotates in
- [ ] Correct answer: "+10 pts" badge appears
- [ ] Wrong answer: Red background
- [ ] Wrong answer: X mark appears
- [ ] Wrong answer: Correct answer highlighted
- [ ] Animations smooth (no jank)

### Perfect Score Celebration
- [ ] Confetti animation triggers at 100%
- [ ] 200 confetti pieces
- [ ] Lasts ~5 seconds
- [ ] Colorful pieces (gold, orange, red, green, blue, purple)
- [ ] Doesn't block UI interaction
- [ ] Works on mobile

### Achievement Unlock
- [ ] Full-screen modal appears
- [ ] Badge zooms in with rotation
- [ ] Particle effects around badge
- [ ] Modal dismissable
- [ ] Sound effect (if implemented)

### Level Up Toast
- [ ] Toast slides down from top
- [ ] Shows old → new level
- [ ] Celebration emoji (🎉)
- [ ] Trophy emoji (🏆)
- [ ] Shimmer effect
- [ ] Sparkles (✨⭐💫)
- [ ] Auto-dismisses after 4 seconds

### Progress Bar
- [ ] Animated fill (smooth)
- [ ] Shows current question (e.g., "سؤال 3 من 10")
- [ ] Shows correct count if applicable
- [ ] Percentage displayed
- [ ] Updates smoothly

**Framerate Check:**
- [ ] All animations at 60fps (smooth)
- [ ] No stuttering on slow devices
- [ ] No layout shifts during animations

**Notes/Issues:**
```

```

---

## 📱 Part 5: Student Dashboard

### Stats Overview
- [ ] Total points displayed
- [ ] Current level displayed
- [ ] Current streak displayed
- [ ] Total quizzes completed
- [ ] Total questions answered
- [ ] Overall accuracy percentage

### Achievement Gallery
- [ ] Grid of achievement cards
- [ ] Earned achievements full color
- [ ] Locked achievements greyed out
- [ ] Achievement names in Arabic
- [ ] Achievement icons display
- [ ] Click to view details (if applicable)

### Progress by Lesson
- [ ] All lessons listed
- [ ] Current difficulty shown per lesson
- [ ] Mastery indicators (✓) for completed levels
- [ ] Visual progress bars
- [ ] Can navigate to lesson

### Activity Calendar
- [ ] Heatmap showing daily activity
- [ ] Similar to GitHub contributions
- [ ] Hover shows date details
- [ ] Current streak highlighted

**Notes/Issues:**
```

```

---

## 👨‍🏫 Part 6: Teacher Dashboard

### Student Progress Section
- [ ] Section visible when class is active
- [ ] "Student Progress & Adaptive Difficulty Tracking" heading
- [ ] Shows all students in class
- [ ] Each student card displays:
  - [ ] Student name
  - [ ] Level number
  - [ ] Total quizzes completed
  - [ ] Total points
  - [ ] Current streak (🔥)

### Lesson Progress Per Student
- [ ] All lessons listed for each student
- [ ] Current difficulty badge displayed
- [ ] Three difficulty columns: Easy | Medium | Hard
- [ ] Each column shows:
  - [ ] Mastery status (✓ if mastered)
  - [ ] Accuracy percentage
  - [ ] Status: "Mastered" / "In Progress" / "Locked"
- [ ] Color coding matches difficulty

### Refresh Functionality
- [ ] Refresh button works
- [ ] Stats update correctly
- [ ] Loading indicator appears
- [ ] No errors in console

### Empty States
- [ ] "No students yet" message if no students
- [ ] "No lesson progress yet" if student hasn't started

**Notes/Issues:**
```

```

---

## 🤖 Part 7: AI Question Generation

### Generation Quality
- [ ] Generates exactly 13 questions
- [ ] Distribution: 5 easy, 5 medium, 3 hard
- [ ] All 4 question types included
- [ ] Questions age-appropriate for Grade 6
- [ ] Arabic grammar correct
- [ ] Questions relevant to topic

### Question Validation
- [ ] MCQ has 4 choices
- [ ] True/False has boolean answer
- [ ] Fill-blank has ____ placeholder
- [ ] Matching has 2-3 pairs
- [ ] Points match difficulty

### Error Handling
- [ ] Invalid JSON handled gracefully
- [ ] Missing fields caught
- [ ] Regenerate option works
- [ ] Error message clear to teacher

**Test 3 Different Topics:**
1. Topic: _______________ → Quality: ⭐⭐⭐⭐⭐ (5 = excellent)
2. Topic: _______________ → Quality: ⭐⭐⭐⭐⭐
3. Topic: _______________ → Quality: ⭐⭐⭐⭐⭐

**Notes/Issues:**
```

```

---

## 🌍 Part 8: RTL (Right-to-Left) Support

### Arabic Text
- [ ] All Arabic text flows right-to-left
- [ ] Badges RTL
- [ ] Progress bars RTL
- [ ] Quiz choices RTL
- [ ] Dashboard RTL
- [ ] Modals RTL

### Layout
- [ ] Icons on correct side
- [ ] Navigation reversed appropriately
- [ ] Margins/padding correct
- [ ] Animations don't break RTL

**Notes/Issues:**
```

```

---

## ⚡ Part 9: Performance

### Load Times (Record actual times)
- [ ] Quiz page: _______ seconds (target: < 2s)
- [ ] Dashboard page: _______ seconds (target: < 1s)
- [ ] Teacher page: _______ seconds (target: < 2s)

### Responsiveness
- [ ] Quiz submission: < 1 second
- [ ] Achievement check: < 300ms
- [ ] Stats update: < 500ms

### Resource Usage
- [ ] No console errors
- [ ] No memory leaks (refresh 10x, still responsive)
- [ ] Images load efficiently
- [ ] No excessive API calls

**Device Specs:**
- CPU: _______________
- RAM: _______________
- Network: _______________

**Notes/Issues:**
```

```

---

## 🔍 Part 10: Edge Cases

### Unanswered Questions
- [ ] Can submit quiz with unanswered questions
- [ ] Unanswered marked as incorrect
- [ ] Score calculated correctly

### Network Errors
- [ ] Offline: Shows error message
- [ ] Slow connection: Loading indicator
- [ ] Failed submission: Retry option
- [ ] No data loss on error

### Data Edge Cases
- [ ] Empty class (no students)
- [ ] Student with no quizzes
- [ ] Lesson with no questions
- [ ] Achievement already earned (no duplicate)

### Browser Refresh
- [ ] Quiz state not lost
- [ ] Difficulty level preserved
- [ ] Points persist
- [ ] Streak maintained

**Notes/Issues:**
```

```

---

## 🌐 Part 11: Cross-Browser Testing

### Chrome (Latest)
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Safari (Latest)
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Firefox (Latest)
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Mobile Safari (iOS)
- [ ] Touch interactions work
- [ ] Layout responsive
- [ ] Animations smooth

### Mobile Chrome (Android)
- [ ] Touch interactions work
- [ ] Layout responsive
- [ ] Animations smooth

**Notes/Issues:**
```

```

---

## ♿ Part 12: Accessibility

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Enter/Space activates buttons
- [ ] Can complete quiz with keyboard only

### Screen Reader
- [ ] Images have alt text
- [ ] Buttons have aria-labels
- [ ] Form inputs have labels
- [ ] Live regions for dynamic content

### Visual
- [ ] Color contrast meets WCAG AA
- [ ] Text readable at 200% zoom
- [ ] No text in images
- [ ] Focus indicators clear

**Notes/Issues:**
```

```

---

## 📝 Bug Summary

### Critical Bugs (System unusable)
```
1.
2.
3.
```

### High Priority (Major feature broken)
```
1.
2.
3.
```

### Medium Priority (Minor feature broken)
```
1.
2.
3.
```

### Low Priority (Cosmetic issues)
```
1.
2.
3.
```

---

## ✅ Final Sign-Off

- [ ] All critical tests passed
- [ ] All high priority tests passed
- [ ] Performance benchmarks met
- [ ] Animations smooth and delightful
- [ ] Ready for production

**Overall Assessment:** Pass / Fail / Needs Work (Circle one)

**Tester Signature:** ___________________
**Date:** ___________________

---

## 📸 Screenshots / Videos

Attach screenshots of:
- Perfect score confetti
- Achievement unlock modal
- Level up toast
- Student dashboard
- Teacher progress table
- Any bugs found

**Upload Location:** ___________________
