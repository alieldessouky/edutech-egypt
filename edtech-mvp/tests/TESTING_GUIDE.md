# Adaptive Quiz System - Testing Guide

## Overview

This guide covers testing for the complete adaptive quiz system with gamification for the Egyptian History Grade 6 edtech platform.

## Test Categories

### 1. Unit Tests
Test individual functions and components in isolation.

### 2. Integration Tests
Test how different parts of the system work together.

### 3. E2E Tests
Test complete user flows from start to finish.

### 4. Manual QA
Human verification of UX, animations, and edge cases.

---

## Unit Test Examples

### Adaptive Difficulty Algorithm (`app/lib/adaptive.ts`)

```typescript
// Test: Student progresses from easy to medium after 80% accuracy
describe('updateStudentProgress', () => {
  test('should progress to medium after mastering easy', async () => {
    // Setup: Student with 8/10 correct on easy (80%)
    const studentId = 'test-student-123';
    const lessonId = 'test-lesson-456';

    // Create initial progress at easy level
    await createProgress(studentId, lessonId, {
      current_difficulty: 'easy',
      easy_correct: 8,
      easy_total: 10,
      easy_mastered: false
    });

    // Simulate quiz completion with 80% accuracy
    const attempt = {
      score: 8,
      totalQuestions: 10,
      difficulty: 'easy'
    };

    const result = await updateStudentProgress(studentId, lessonId, attempt);

    // Verify mastery and progression
    expect(result.masteredLevel).toBe('easy');
    expect(result.nextLevel).toBe('medium');

    // Verify database updated
    const progress = await getProgress(studentId, lessonId);
    expect(progress.current_difficulty).toBe('medium');
    expect(progress.easy_mastered).toBe(true);
  });

  test('should not progress with less than 80% accuracy', async () => {
    // Setup: Student with 7/10 correct (70%)
    const result = await updateStudentProgress(studentId, lessonId, {
      score: 7,
      totalQuestions: 10,
      difficulty: 'easy'
    });

    expect(result.masteredLevel).toBeUndefined();
    expect(result.nextLevel).toBeUndefined();
  });

  test('should require minimum 5 questions before mastery', async () => {
    // Setup: Student with 4/4 correct (100% but only 4 questions)
    const result = await updateStudentProgress(studentId, lessonId, {
      score: 4,
      totalQuestions: 4,
      difficulty: 'easy'
    });

    expect(result.masteredLevel).toBeUndefined();
  });
});
```

### Grading Logic (`app/lib/grading.ts`)

```typescript
describe('gradeQuestion', () => {
  test('should grade MCQ correctly', () => {
    const question = {
      question_type: 'mcq',
      type_data: { correctIndex: 2 },
      points: 10
    };

    const correctAnswer = { selectedIndex: 2 };
    const wrongAnswer = { selectedIndex: 0 };

    expect(gradeQuestion(question, correctAnswer)).toEqual({
      isCorrect: true,
      points: 10
    });

    expect(gradeQuestion(question, wrongAnswer)).toEqual({
      isCorrect: false,
      points: 0
    });
  });

  test('should grade True/False correctly', () => {
    const question = {
      question_type: 'true_false',
      type_data: { correctAnswer: true },
      points: 10
    };

    expect(gradeQuestion(question, { value: true })).toEqual({
      isCorrect: true,
      points: 10
    });
  });

  test('should grade fill-in-blank with multiple accepted answers', () => {
    const question = {
      question_type: 'fill_blank',
      type_data: {
        acceptedAnswers: ['1919', '١٩١٩'],
        caseSensitive: false
      },
      points: 20
    };

    // Both Arabic and English should work
    expect(gradeQuestion(question, { text: '1919' }).isCorrect).toBe(true);
    expect(gradeQuestion(question, { text: '١٩١٩' }).isCorrect).toBe(true);

    // Case insensitive
    expect(gradeQuestion(question, { text: ' 1919 ' }).isCorrect).toBe(true);
  });

  test('should grade matching with partial credit', () => {
    const question = {
      question_type: 'matching',
      type_data: {
        pairs: [
          { left: 'A', right: '1' },
          { left: 'B', right: '2' }
        ],
        allowPartialCredit: true
      },
      points: 40
    };

    // All correct
    const allCorrect = { matches: ['1', '2'] };
    expect(gradeQuestion(question, allCorrect)).toEqual({
      isCorrect: true,
      points: 40,
      partialCredit: 1
    });

    // Half correct
    const halfCorrect = { matches: ['1', '3'] };
    const result = gradeQuestion(question, halfCorrect);
    expect(result.isCorrect).toBe(false);
    expect(result.points).toBe(20);
    expect(result.partialCredit).toBe(0.5);
  });
});
```

### Gamification System (`app/lib/gamification.ts`)

```typescript
describe('checkAndAwardAchievements', () => {
  test('should award first quiz achievement', async () => {
    const studentId = 'test-student';

    // Update stats to 1 quiz
    await updateStudentStats(studentId, { total_quizzes: 1 });

    const awarded = await checkAndAwardAchievements(studentId);

    expect(awarded).toContainEqual(
      expect.objectContaining({ code: 'first_quiz' })
    );
  });

  test('should award streak achievements', async () => {
    await updateStudentStats(studentId, { current_streak: 3 });
    const awarded = await checkAndAwardAchievements(studentId);

    expect(awarded).toContainEqual(
      expect.objectContaining({ code: 'streak_3' })
    );
  });

  test('should not award achievements twice', async () => {
    // Award once
    await checkAndAwardAchievements(studentId);

    // Try again
    const secondTry = await checkAndAwardAchievements(studentId);

    expect(secondTry).toHaveLength(0);
  });
});

describe('updateStreak', () => {
  test('should increment streak on consecutive day', async () => {
    // Day 1
    await updateStreak(studentId);

    // Day 2 (simulate next day)
    const result = await updateStreak(studentId);

    expect(result.streakIncreased).toBe(true);
    expect(result.currentStreak).toBe(2);
  });

  test('should break streak after missing day', async () => {
    // Setup 5-day streak
    await setStreak(studentId, 5);

    // Simulate 2 days gap
    const result = await updateStreak(studentId);

    expect(result.streakBroken).toBe(true);
    expect(result.currentStreak).toBe(1);
  });

  test('should not change streak on same day', async () => {
    await updateStreak(studentId);
    const result = await updateStreak(studentId);

    expect(result.streakIncreased).toBe(false);
    expect(result.streakBroken).toBe(false);
  });
});
```

---

## Integration Test Examples

### Complete Quiz Flow

```typescript
describe('Complete Quiz Integration', () => {
  test('student completes quiz and earns achievement', async () => {
    // 1. Setup
    const student = await createTestStudent();
    const lesson = await createTestLesson({
      difficulty: 'easy',
      questionCount: 10
    });

    // 2. Start quiz
    const questions = await getQuestionsForStudent(student.id, lesson.id, lesson.quiz_id);
    expect(questions).toHaveLength(10);
    expect(questions[0].difficulty).toBe('easy');

    // 3. Answer all correctly
    const answers = questions.map(q => ({
      question_id: q.id,
      answer: getCorrectAnswer(q)
    }));

    // 4. Submit quiz
    const result = await submitQuiz(student.id, lesson.quiz_id, answers);

    // 5. Verify score
    expect(result.score).toBe(10);
    expect(result.percentage).toBe(100);
    expect(result.pointsEarned).toBeGreaterThan(0);

    // 6. Verify achievement unlocked
    expect(result.newAchievements).toContainEqual(
      expect.objectContaining({ code: 'first_quiz' })
    );

    // 7. Verify stats updated
    const stats = await getStudentStats(student.id);
    expect(stats.total_quizzes).toBe(1);
    expect(stats.total_points).toBeGreaterThan(0);
  });
});
```

### Progression Flow

```typescript
describe('Difficulty Progression Integration', () => {
  test('mastering easy level shows next quiz at medium', async () => {
    const student = await createTestStudent();
    const lesson = await createTestLesson();

    // Complete 2 easy quizzes at 100%
    for (let i = 0; i < 2; i++) {
      const questions = await getQuestionsForStudent(student.id, lesson.id, lesson.quiz_id);
      const answers = questions.map(q => ({ question_id: q.id, answer: getCorrectAnswer(q) }));
      await submitQuiz(student.id, lesson.quiz_id, answers);
    }

    // Verify mastery
    const progress = await getProgress(student.id, lesson.id);
    expect(progress.easy_mastered).toBe(true);
    expect(progress.current_difficulty).toBe('medium');

    // Start new quiz
    const nextQuestions = await getQuestionsForStudent(student.id, lesson.id, lesson.quiz_id);
    expect(nextQuestions[0].difficulty).toBe('medium');
  });
});
```

---

## E2E Test Examples (Playwright)

### Student Quiz Flow

```typescript
// tests/e2e/student-quiz.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Student Quiz Experience', () => {
  test('complete quiz and see animations', async ({ page }) => {
    // 1. Navigate to class page
    await page.goto('/c/test-class-id');

    // 2. Join as student
    await page.fill('[placeholder="Enter your name"]', 'Test Student');
    await page.click('button:has-text("Join Class")');

    // 3. Select lesson
    await page.click('[data-testid="lesson-card"]:first-child');
    await page.click('button:has-text("Start Quiz")');

    // 4. Verify difficulty badge shows
    await expect(page.locator('[data-testid="difficulty-badge"]')).toContainText('سهل');

    // 5. Answer first question correctly
    await page.click('[data-testid="quiz-choice"]:first-child');
    await page.click('button:has-text("Next")');

    // 6. Verify correct answer animation
    await expect(page.locator('[data-testid="answer-feedback"]')).toContainText('إجابة صحيحة');
    await expect(page.locator('[data-testid="points-display"]')).toBeVisible();

    // 7. Complete all questions
    for (let i = 1; i < 10; i++) {
      await page.click('[data-testid="quiz-choice"]:first-child');
      await page.click('button:has-text("Next")');
    }

    // 8. Submit quiz
    await page.click('button:has-text("Submit Quiz")');

    // 9. Verify perfect score confetti
    await expect(page.locator('canvas')).toBeVisible(); // Confetti canvas

    // 10. Verify achievement modal
    await expect(page.locator('[data-testid="achievement-modal"]')).toBeVisible();
  });

  test('adaptive difficulty progression', async ({ page }) => {
    // Complete easy quiz with 100%
    await completeQuiz(page, 'easy', 100);

    // Verify mastery message
    await expect(page.locator('text=You mastered Easy level!')).toBeVisible();
    await expect(page.locator('text=Moving to Medium!')).toBeVisible();

    // Start new quiz
    await page.click('button:has-text("Start New Quiz")');

    // Verify medium difficulty badge
    await expect(page.locator('[data-testid="difficulty-badge"]')).toContainText('متوسط');
  });
});
```

### Teacher Dashboard

```typescript
// tests/e2e/teacher-dashboard.spec.ts
test.describe('Teacher Dashboard', () => {
  test('view student progress table', async ({ page }) => {
    await page.goto('/teacher');

    // Create class
    await page.fill('[placeholder="Class Name"]', 'Test Class');
    await page.click('button:has-text("Create Class")');

    // Wait for student progress section
    await expect(page.locator('h2:has-text("Student Progress")')).toBeVisible();

    // Verify table headers
    await expect(page.locator('text=Student Name')).toBeVisible();
    await expect(page.locator('text=Current Difficulty')).toBeVisible();
    await expect(page.locator('text=Total Points')).toBeVisible();

    // Verify student data (if students exist)
    const studentRows = page.locator('[data-testid="student-progress-row"]');
    if (await studentRows.count() > 0) {
      await expect(studentRows.first()).toContainText(/⭐+/); // Difficulty stars
    }
  });
});
```

---

## Manual QA Checklist

### ✅ Question Types

- [ ] MCQ renders with 4 choices
- [ ] True/False shows large buttons
- [ ] Fill-in-blank accepts multiple correct answers (Arabic & English)
- [ ] Matching allows drag-and-drop or selection
- [ ] All question types work on mobile and desktop

### ✅ Grading Accuracy

- [ ] MCQ graded correctly (right/wrong)
- [ ] True/False graded correctly
- [ ] Fill-in-blank case-insensitive matching works
- [ ] Fill-in-blank Arabic numerals (١٩١٩) accepted
- [ ] Matching partial credit calculated correctly
- [ ] Test 50+ sample questions across all types

### ✅ Adaptive Difficulty

- [ ] Students start at easy level
- [ ] 80% accuracy triggers mastery check
- [ ] Minimum 5 questions required for mastery
- [ ] Progression message shows: "You mastered Easy!"
- [ ] Next quiz shows medium difficulty questions
- [ ] Hard level unlocks after mastering medium
- [ ] Cannot skip difficulty levels

### ✅ Gamification

- [ ] Points calculated correctly (easy=10, medium=20, hard=40)
- [ ] Perfect score bonus (+50) awarded
- [ ] First attempt bonus (+10) awarded
- [ ] Achievements unlock at correct milestones
- [ ] Streak increments on consecutive days
- [ ] Streak breaks after missing day
- [ ] Level up occurs at correct point thresholds

### ✅ Animations & UX

- [ ] Correct answer: green fade-in + checkmark scale
- [ ] Wrong answer: red shake + correct answer highlight
- [ ] Perfect score: confetti animation (5 seconds)
- [ ] Achievement unlock: modal with badge zoom + particles
- [ ] Level up: toast notification with fireworks
- [ ] All animations smooth (60fps, no jank)
- [ ] No layout shifts during animations
- [ ] Animations work on mobile

### ✅ Student Dashboard

- [ ] Total points display accurate
- [ ] Current level calculated correctly
- [ ] Streak counter accurate
- [ ] Achievement gallery shows earned badges
- [ ] Locked achievements greyed out
- [ ] Progress by lesson shows difficulty levels
- [ ] Activity calendar renders correctly

### ✅ Teacher Dashboard

- [ ] Student progress table loads
- [ ] Shows all students in class
- [ ] Displays current difficulty per lesson
- [ ] Mastery indicators (✓) show correctly
- [ ] Points and streak data accurate
- [ ] Filtering/sorting works (if implemented)
- [ ] Refresh button updates data

### ✅ AI Generation

- [ ] Generates exactly 13 questions
- [ ] Distribution: 5 easy, 5 medium, 3 hard
- [ ] All 4 question types generated
- [ ] Questions age-appropriate for Grade 6
- [ ] Arabic text grammatically correct
- [ ] Point values match difficulty
- [ ] 80%+ generation quality rate
- [ ] Regeneration works if quality poor

### ✅ RTL Support

- [ ] All Arabic text right-to-left
- [ ] Badges and UI components RTL
- [ ] Animations don't break RTL layout
- [ ] Mobile RTL layout correct

### ✅ Performance

- [ ] Quiz loads in < 2 seconds
- [ ] Dashboard loads in < 1 second
- [ ] Animations run at 60fps
- [ ] No memory leaks during long sessions
- [ ] Images load efficiently

### ✅ Edge Cases

- [ ] Empty state: No students joined
- [ ] Empty state: No quizzes completed
- [ ] Unanswered questions marked incorrect
- [ ] Network error handling graceful
- [ ] Duplicate achievement prevention
- [ ] Same-day streak doesn't increment twice

### ✅ Cross-Browser

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### ✅ Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible

---

## Performance Benchmarks

### Load Times
- Quiz page: < 2 seconds
- Dashboard: < 1 second
- Teacher page: < 2 seconds

### Animation FPS
- Target: 60fps
- Acceptable: 50fps minimum
- Test on low-end devices

### Database Queries
- Student progress query: < 500ms
- Quiz submission: < 1 second
- Achievement check: < 300ms

---

## Bug Reporting Template

When you find a bug during QA:

```markdown
**Title:** [Component] Brief description

**Severity:** Critical | High | Medium | Low

**Steps to Reproduce:**
1. Navigate to...
2. Click on...
3. Observe...

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Screenshots/Videos:**
Attach if available

**Environment:**
- Browser: Chrome 120
- OS: macOS 14
- Device: Desktop / Mobile
```

---

## Success Criteria

Phase 7 is complete when:

- ✅ All unit tests pass (95%+ coverage for core logic)
- ✅ All integration tests pass
- ✅ E2E tests cover critical user flows
- ✅ Manual QA checklist 100% complete
- ✅ No critical or high severity bugs
- ✅ Performance benchmarks met
- ✅ Teacher dashboard shows student progress
- ✅ System ready for student use

---

## Next Steps After Testing

1. **Performance Optimization**: Address any bottlenecks found
2. **Bug Fixes**: Resolve all identified issues
3. **User Acceptance Testing**: Get feedback from real teachers/students
4. **Production Deployment**: Deploy to live environment
5. **Monitoring**: Set up error tracking and analytics

Good luck with testing! 🚀
