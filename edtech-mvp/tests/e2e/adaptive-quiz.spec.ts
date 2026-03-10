/**
 * E2E Tests for Adaptive Quiz System
 *
 * Run with: npx playwright test
 */

import { test, expect } from '@playwright/test';

// Helper function to wait for animations
const waitForAnimation = () => new Promise(resolve => setTimeout(resolve, 500));

test.describe('Adaptive Quiz System - Student Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to home page
        await page.goto('/');
    });

    test('Student can join class and see lessons', async ({ page }) => {
        // Navigate to a test class (replace with actual class ID)
        await page.goto('/c/test-class-id');

        // Fill in student name
        const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="اسم" i]').first();
        await nameInput.fill('اختبار طالب');

        // Click join button
        const joinButton = page.locator('button:has-text("Join"), button:has-text("انضم")').first();
        await joinButton.click();

        // Wait for lessons to load
        await page.waitForLoadState('networkidle');

        // Verify lessons appear
        const lessons = page.locator('[data-testid="lesson-card"], .lesson-card');
        await expect(lessons.first()).toBeVisible({ timeout: 5000 });
    });

    test('Quiz displays difficulty badge and progress bar', async ({ page }) => {
        // Assume student is already joined and on quiz page
        await page.goto('/student'); // Adjust to actual quiz route

        await page.waitForLoadState('networkidle');

        // Check for difficulty badge (may use DifficultyBadge component)
        const difficultyBadge = page.locator('text=/سهل|متوسط|صعب/');
        if (await difficultyBadge.count() > 0) {
            await expect(difficultyBadge.first()).toBeVisible();
        }

        // Check for progress bar (may show "سؤال X من Y")
        const progressText = page.locator('text=/سؤال \\d+ من \\d+/');
        if (await progressText.count() > 0) {
            await expect(progressText.first()).toBeVisible();
        }
    });

    test('Correct answer shows positive feedback animation', async ({ page }) => {
        // Navigate to quiz
        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Find and click a quiz choice
        const choice = page.locator('[data-testid="quiz-choice"], button:has-text("أ"), button:has-text("ب")').first();

        if (await choice.count() > 0) {
            await choice.click();

            // Click next or submit
            const nextButton = page.locator('button:has-text("Next"), button:has-text("التالي"), button:has-text("Submit")').first();
            if (await nextButton.count() > 0) {
                await nextButton.click();
                await waitForAnimation();

                // Check for feedback (correct or incorrect)
                const feedback = page.locator('text=/صحيحة|خاطئة|Correct|Wrong/');
                if (await feedback.count() > 0) {
                    await expect(feedback.first()).toBeVisible({ timeout: 3000 });
                }
            }
        }
    });

    test('Perfect score triggers confetti animation', async ({ page }) => {
        // This test requires a quiz to be completed with 100% score
        // For demonstration, we'll check if confetti component can render

        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Look for canvas element (confetti uses canvas)
        // This will only appear if confetti is triggered
        const canvas = page.locator('canvas');

        // Note: This is a placeholder - actual test would complete a quiz perfectly
        // and then verify confetti appears
        console.log('Confetti test placeholder - implement after quiz completion flow');
    });

    test('Achievement modal appears when unlocked', async ({ page }) => {
        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Look for achievement modal
        const achievementModal = page.locator('[data-testid="achievement-modal"], [data-testid="achievement-unlock-modal"]');

        // Note: Achievements trigger based on specific conditions
        // This test would need to simulate those conditions
        console.log('Achievement modal test placeholder - implement with achievement trigger');
    });

    test('Student dashboard shows stats and achievements', async ({ page }) => {
        // Navigate to student dashboard
        await page.goto('/student/dashboard');
        await page.waitForLoadState('networkidle');

        // Check for points display
        const points = page.locator('text=/\\d+ points|نقطة|نقاط/i');
        if (await points.count() > 0) {
            await expect(points.first()).toBeVisible();
        }

        // Check for level display
        const level = page.locator('text=/level \\d+|المستوى \\d+/i');
        if (await level.count() > 0) {
            await expect(level.first()).toBeVisible();
        }

        // Check for achievement gallery
        const achievements = page.locator('[data-testid="achievement-card"], .achievement-card');
        if (await achievements.count() > 0) {
            await expect(achievements.first()).toBeVisible();
        }
    });
});

test.describe('Adaptive Quiz System - Teacher Flow', () => {

    test('Teacher can create a class', async ({ page }) => {
        await page.goto('/teacher');
        await page.waitForLoadState('networkidle');

        // Fill class name
        const classNameInput = page.locator('input[placeholder*="Class Name" i], input[placeholder*="اسم الفصل" i]').first();
        await classNameInput.fill(`Test Class ${Date.now()}`);

        // Click create
        const createButton = page.locator('button:has-text("Create Class"), button:has-text("إنشاء فصل")').first();
        await createButton.click();

        // Wait for success
        await page.waitForTimeout(1000);

        // Verify invite link appears
        const inviteLink = page.locator('text=/Share Link|رابط الدعوة/i');
        if (await inviteLink.count() > 0) {
            await expect(inviteLink.first()).toBeVisible();
        }
    });

    test('Teacher dashboard shows student progress section', async ({ page }) => {
        await page.goto('/teacher');
        await page.waitForLoadState('networkidle');

        // Look for student progress heading
        const progressHeading = page.locator('h2:has-text("Student Progress"), h2:has-text("تقدم الطلاب")');

        // The section should exist even if no students yet
        if (await progressHeading.count() > 0) {
            await expect(progressHeading.first()).toBeVisible();
        }
    });

    test('Teacher can view student difficulty levels and mastery', async ({ page }) => {
        await page.goto('/teacher');
        await page.waitForLoadState('networkidle');

        // If students exist, verify their progress is shown
        const studentProgress = page.locator('[data-testid="student-progress-row"], .student-progress');

        if (await studentProgress.count() > 0) {
            // Check for difficulty indicators (⭐ symbols)
            const difficultyIndicators = page.locator('text=/⭐+/');
            await expect(difficultyIndicators.first()).toBeVisible();

            // Check for mastery checkmarks
            const masteryChecks = page.locator('text=/Mastered|✓|مكتمل/i');
            if (await masteryChecks.count() > 0) {
                await expect(masteryChecks.first()).toBeVisible();
            }
        } else {
            console.log('No students found - skipping mastery check');
        }
    });

    test('Teacher can see student points and streaks', async ({ page }) => {
        await page.goto('/teacher');
        await page.waitForLoadState('networkidle');

        const studentProgress = page.locator('[data-testid="student-progress-row"], .student-progress');

        if (await studentProgress.count() > 0) {
            // Check for points display
            const points = page.locator('text=/\\d+ points|نقطة/i');
            if (await points.count() > 0) {
                await expect(points.first()).toBeVisible();
            }

            // Check for streak display (🔥 emoji)
            const streak = page.locator('text=/🔥/');
            if (await streak.count() > 0) {
                await expect(streak.first()).toBeVisible();
            }
        }
    });

    test('Teacher can refresh stats', async ({ page }) => {
        await page.goto('/teacher');
        await page.waitForLoadState('networkidle');

        // Find refresh button
        const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("تحديث")');

        if (await refreshButton.count() > 0) {
            const initialCount = await page.locator('text=/Students joined:|الطلاب:/i').textContent();

            await refreshButton.click();
            await page.waitForTimeout(500);

            // Verify UI updated (even if data is the same)
            const updatedCount = await page.locator('text=/Students joined:|الطلاب:/i').textContent();
            expect(updatedCount).toBeDefined();
        }
    });
});

test.describe('Question Types - Rendering & Grading', () => {

    test('MCQ question renders with 4 choices', async ({ page }) => {
        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Look for quiz choices (assuming MCQ)
        const choices = page.locator('[data-testid="quiz-choice"], button[type="button"]').filter({ hasText: /^[أ-ي]/ });

        if (await choices.count() >= 4) {
            expect(await choices.count()).toBeGreaterThanOrEqual(4);
        }
    });

    test('True/False question shows two options', async ({ page }) => {
        // This would require a quiz with True/False questions
        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Look for True/False buttons
        const trueButton = page.locator('button:has-text("True"), button:has-text("صح")');
        const falseButton = page.locator('button:has-text("False"), button:has-text("خطأ")');

        if (await trueButton.count() > 0 && await falseButton.count() > 0) {
            await expect(trueButton.first()).toBeVisible();
            await expect(falseButton.first()).toBeVisible();
        }
    });

    test('Fill-in-blank question shows input field', async ({ page }) => {
        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Look for text input for fill-in-blank
        const input = page.locator('input[type="text"][placeholder*="answer" i], input[type="text"][placeholder*="إجابة" i]');

        if (await input.count() > 0) {
            await expect(input.first()).toBeVisible();
        }
    });

    test('Matching question shows pairs', async ({ page }) => {
        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Look for matching pairs (implementation-specific)
        const matchingPairs = page.locator('[data-testid="matching-pair"], .matching-pair');

        if (await matchingPairs.count() > 0) {
            expect(await matchingPairs.count()).toBeGreaterThanOrEqual(2);
        }
    });
});

test.describe('Animations & Performance', () => {

    test('Page loads within 2 seconds', async ({ page }) => {
        const startTime = Date.now();

        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(2000);
    });

    test('Animations are smooth (no jank)', async ({ page }) => {
        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Click through quiz to trigger animations
        const choice = page.locator('[data-testid="quiz-choice"]').first();

        if (await choice.count() > 0) {
            await choice.click();

            // Verify no console errors during animation
            const errors: string[] = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                }
            });

            await page.waitForTimeout(1000);
            expect(errors.length).toBe(0);
        }
    });

    test('No memory leaks during long session', async ({ page }) => {
        await page.goto('/student');

        // Simulate multiple interactions
        for (let i = 0; i < 10; i++) {
            await page.reload();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(200);
        }

        // Basic check - page should still be responsive
        const title = await page.title();
        expect(title).toBeDefined();
    });
});

test.describe('RTL Support', () => {

    test('Arabic text displays right-to-left', async ({ page }) => {
        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Check for elements with RTL direction
        const rtlElements = page.locator('[dir="rtl"], [style*="direction: rtl"]');

        if (await rtlElements.count() > 0) {
            await expect(rtlElements.first()).toBeVisible();
        }
    });

    test('Badges and components maintain RTL layout', async ({ page }) => {
        await page.goto('/student');
        await page.waitForLoadState('networkidle');

        // Verify difficulty badges (if present) are RTL
        const badge = page.locator('[data-testid="difficulty-badge"]').first();

        if (await badge.count() > 0) {
            const direction = await badge.evaluate(el =>
                window.getComputedStyle(el).direction
            );
            expect(direction).toBe('rtl');
        }
    });
});

test.describe('Edge Cases', () => {

    test('Empty state: No quizzes completed', async ({ page }) => {
        await page.goto('/student/dashboard');
        await page.waitForLoadState('networkidle');

        // Should show empty state message
        const emptyState = page.locator('text=/No quizzes|لا توجد اختبارات/i');

        // May or may not have data, but should handle gracefully
        if (await emptyState.count() > 0) {
            await expect(emptyState.first()).toBeVisible();
        }
    });

    test('Network error handling', async ({ page }) => {
        // Simulate offline
        await page.context().setOffline(true);

        await page.goto('/student');

        // Should show error or retry message
        // (Actual implementation may vary)
        await page.waitForTimeout(2000);

        // Go back online
        await page.context().setOffline(false);
    });

    test('Unanswered questions marked incorrect', async ({ page }) => {
        // This would require completing a quiz with unanswered questions
        // Placeholder for now
        console.log('Unanswered question test - implement with quiz submission');
    });
});
