# Testing Documentation - Adaptive Quiz System

Welcome to the testing suite for the Egyptian History Grade 6 Adaptive Quiz System!

## 📁 Directory Structure

```
tests/
├── README.md                      # This file
├── TESTING_GUIDE.md              # Comprehensive testing guide with examples
├── MANUAL_QA_CHECKLIST.md        # Printable QA checklist for manual testing
└── e2e/
    └── adaptive-quiz.spec.ts     # End-to-end tests with Playwright
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Playwright** (will be installed below)

### Installation

```bash
# Install Playwright and browsers
npm install -D @playwright/test
npx playwright install
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test tests/e2e/adaptive-quiz.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run RTL tests specifically
npx playwright test --project="RTL Testing"

# Run mobile tests
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Viewing Test Reports

```bash
# Open HTML report after test run
npx playwright show-report
```

## 📚 Documentation Files

### 1. TESTING_GUIDE.md
Comprehensive guide covering:
- Unit test examples for adaptive algorithm, grading, gamification
- Integration test examples for quiz flow, progression
- E2E test examples for student and teacher flows
- Performance benchmarks
- Bug reporting template
- Success criteria

**When to use:** Reference for writing new tests or understanding testing strategy.

### 2. MANUAL_QA_CHECKLIST.md
Printable checklist for manual testing covering:
- All 4 question types
- Adaptive difficulty system
- Gamification (points, achievements, streaks)
- Animations and visual feedback
- Student and teacher dashboards
- AI generation quality
- RTL support
- Performance metrics
- Cross-browser testing
- Accessibility

**When to use:** Before each release, print and work through systematically.

### 3. E2E Tests (adaptive-quiz.spec.ts)
Automated end-to-end tests using Playwright covering:
- Student quiz flow
- Teacher dashboard
- Question type rendering
- Animations and performance
- RTL support
- Edge cases

**When to use:** Run automatically in CI/CD and before each deployment.

## 🎯 Testing Strategy

### Phase 1: Automated Tests (E2E)
Run Playwright tests to catch regressions and verify core functionality.

```bash
npm run test:e2e
```

### Phase 2: Manual QA
Use the checklist to verify UX, animations, and user flows.

1. Print `MANUAL_QA_CHECKLIST.md`
2. Work through each section
3. Record timings, screenshots, bugs
4. Sign off when complete

### Phase 3: User Acceptance Testing (UAT)
- Invite 2-3 teachers to test
- Invite 5-10 students to test
- Gather feedback on usability
- Iterate based on feedback

## 🔧 Adding New Tests

### Unit Tests
Create tests in `__tests__/` directory (to be created):

```bash
mkdir -p app/lib/__tests__
```

Example:
```typescript
// app/lib/__tests__/grading.test.ts
import { gradeQuestion } from '../grading';

describe('gradeQuestion', () => {
  test('grades MCQ correctly', () => {
    // Test implementation
  });
});
```

Run with:
```bash
npm run test:unit  # (add to package.json)
```

### E2E Tests
Add new spec files in `tests/e2e/`:

```typescript
// tests/e2e/achievements.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Achievement System', () => {
  test('unlocks first quiz achievement', async ({ page }) => {
    // Test implementation
  });
});
```

### Integration Tests
Create integration tests in `__tests__/integration/`:

```bash
mkdir -p tests/integration
```

## 📊 Test Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Adaptive Algorithm | 95%+ |
| Grading Logic | 95%+ |
| Gamification | 90%+ |
| UI Components | 70%+ |

## 🐛 Bug Reporting

Found a bug? Use the template in `TESTING_GUIDE.md`:

```markdown
**Title:** [Component] Brief description
**Severity:** Critical | High | Medium | Low
**Steps to Reproduce:** ...
**Expected:** ...
**Actual:** ...
```

Report in:
- GitHub Issues (if repository exists)
- Shared testing document
- Direct message to development team

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All E2E tests passing
- [ ] Manual QA checklist 100% complete
- [ ] No critical or high severity bugs
- [ ] Performance benchmarks met:
  - [ ] Quiz load < 2s
  - [ ] Dashboard load < 1s
  - [ ] Animations 50+ fps
- [ ] Cross-browser tested (Chrome, Safari, Firefox)
- [ ] Mobile tested (iOS Safari, Android Chrome)
- [ ] RTL support verified
- [ ] Accessibility checked
- [ ] Teacher approval obtained
- [ ] Student UAT feedback positive

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📈 Performance Monitoring

### Load Time Benchmarks
- Quiz page: < 2 seconds
- Dashboard: < 1 second
- Teacher page: < 2 seconds

### Monitor with:
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# Playwright performance test
npx playwright test --grep "Page loads within 2 seconds"
```

## 🆘 Troubleshooting

### Tests Failing Locally

1. **Ensure dev server running:**
   ```bash
   npm run dev
   ```

2. **Update Playwright:**
   ```bash
   npm install -D @playwright/test@latest
   npx playwright install
   ```

3. **Clear cache:**
   ```bash
   rm -rf .next
   rm -rf node_modules
   npm install
   ```

### Tests Passing Locally but Failing in CI

1. Check environment variables
2. Verify database seeding
3. Check timing issues (add waits)
4. Review CI logs for errors

### Browser-Specific Issues

Run specific browser to debug:
```bash
npx playwright test --project=firefox --headed --debug
```

## 📞 Support

Need help with testing?

- **Testing Guide:** See `TESTING_GUIDE.md`
- **QA Checklist:** See `MANUAL_QA_CHECKLIST.md`
- **Playwright Docs:** https://playwright.dev
- **Developer Contact:** [Your contact info]

## 📝 License

Same as main project.

---

**Last Updated:** 2024-01-XX
**Version:** 1.0.0
**Maintainer:** Development Team
