---
name: vitest-testing
description: Use this skill whenever writing, modifying, or reviewing tests — unit tests, integration tests, or test infrastructure. Triggers on any mention of Vitest, Supertest, testing, test coverage, mocking, test database, test setup, or assertions. Also use when discussing test strategy, the testing pyramid, test data isolation, or CI test configuration.
---

# Vitest Testing — Budget Tracker

This skill defines the testing strategy, patterns, and conventions for the Budget Tracker project.

## Testing Pyramid

The project follows the testing pyramid: many fast unit tests at the base, fewer integration tests in the middle, and a small number of E2E tests at the top.

- **Unit tests:** Pure functions, validators, utilities, calculation logic. No database, no HTTP.
- **Integration tests:** API routes tested via HTTP with Supertest against a real test database. No mocking of the database.
- **E2E tests:** Playwright browser tests for critical user journeys (separate from this skill).

## Configuration

Vitest is configured in `apps/api/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/utils/**", "src/middleware/**", "src/validators/**"],
      thresholds: { lines: 90 },
    },
  },
});
```

## Unit Tests

### Location and naming

Unit tests live in `tests/unit/`, flat (no subdirectories). Name files after the **business concept** they verify, not the source file they happen to exercise.

```
tests/
├── unit/
│   ├── token-generation.test.ts     → tests jwt.ts utilities
│   ├── password-hashing.test.ts     → tests bcrypt helpers
│   ├── error-classes.test.ts        → tests AppError hierarchy
│   ├── auth-schemas.test.ts         → tests validators/auth.ts
│   └── category-schemas.test.ts     → tests validators/categories.ts
└── integration/
    ├── auth.test.ts
    ├── categories.test.ts
    ├── transactions.test.ts
    └── budgets.test.ts
```

The rule: if the name you would give the test file is the same as the source file, stop and think about what business concept the code actually represents.

### Structure

Use `describe` blocks to group related tests. Use clear, behavior-focused test names.

```typescript
import { describe, it, expect } from "vitest";
import { calculateBudgetPercentage } from "../utils/budget";

describe("calculateBudgetPercentage", () => {
  it("returns 0 when no spending", () => {
    expect(calculateBudgetPercentage("0.00", "400.00")).toBe(0);
  });

  it("returns correct percentage for partial spending", () => {
    expect(calculateBudgetPercentage("200.00", "400.00")).toBe(50);
  });

  it("returns 100 when budget is exactly met", () => {
    expect(calculateBudgetPercentage("400.00", "400.00")).toBe(100);
  });

  it("returns percentage above 100 when overspent", () => {
    expect(calculateBudgetPercentage("500.00", "400.00")).toBe(125);
  });

  it("handles zero budget limit gracefully", () => {
    expect(calculateBudgetPercentage("100.00", "0.00")).toBe(Infinity);
  });
});
```

### What to unit test

- All financial calculation helpers (sums, percentages, budget vs actual)
- All Zod validation schemas (valid and invalid inputs)
- JWT generation and verification utilities
- Recurring rule scheduling logic (is a rule due today?)
- Date utilities
- Any pure function in `src/utils/`

## Integration Tests

### Location

Integration tests live in `tests/integration/`. Supporting files (`setup.ts`, `helpers.ts`) live directly in `tests/`.

```
apps/api/
├── src/
└── tests/
    ├── setup.ts                        # Global test setup and teardown
    ├── helpers.ts                      # Test utilities (create user, get token, etc.)
    ├── unit/
    │   ├── token-generation.test.ts
    │   ├── error-classes.test.ts
    │   └── ...
    └── integration/
        ├── auth.test.ts
        ├── categories.test.ts
        ├── transactions.test.ts
        ├── budgets.test.ts
        └── recurring-rules.test.ts
```

### Test setup

Each test file connects to the real test database. Tests create their own users and data. No shared mutable fixtures.

```typescript
// tests/setup.ts
import { beforeAll, afterAll, afterEach } from "vitest";
import prisma from "../src/prisma";

beforeAll(async () => {
  // Ensure test database is clean
  await cleanDatabase();
});

afterEach(async () => {
  // Clean up between tests for isolation
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function cleanDatabase() {
  // Delete in reverse dependency order
  await prisma.transaction.deleteMany();
  await prisma.budgetCategory.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.recurringRule.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}
```

### Test helpers

Create reusable helpers for common test operations:

```typescript
// tests/helpers.ts
import supertest from "supertest";
import app from "../src/index";

export const request = supertest(app);

export async function createTestUser(overrides = {}) {
  const userData = {
    email: `test-${Date.now()}@example.com`,
    password: "password123",
    name: "Test User",
    ...overrides,
  };

  const res = await request.post("/auth/register").send(userData).expect(201);

  return {
    user: res.body.data.user,
    token: res.body.data.accessToken,
    credentials: userData,
  };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
```

### Integration test pattern

Every resource endpoint must have tests covering these scenarios:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { request, createTestUser, authHeader } from "./helpers";

describe("GET /categories", () => {
  let userA: { token: string };
  let userB: { token: string };

  beforeEach(async () => {
    userA = await createTestUser({ email: "a@test.com" });
    userB = await createTestUser({ email: "b@test.com" });
  });

  it("returns 200 with user's categories", async () => {
    const res = await request
      .get("/categories")
      .set(authHeader(userA.token))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("returns 401 without authentication", async () => {
    await request.get("/categories").expect(401);
  });

  it("does not return another user's categories", async () => {
    // User A creates a category
    await request
      .post("/categories")
      .set(authHeader(userA.token))
      .send({ name: "Private", color: "#000000", icon: "lock" })
      .expect(201);

    // User B should not see it
    const res = await request
      .get("/categories")
      .set(authHeader(userB.token))
      .expect(200);

    const names = res.body.data.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Private");
  });
});
```

### Required test scenarios for every resource

| Scenario | Expected | Priority |
|---|---|---|
| Happy path (correct input) | 200/201 | Required |
| Missing or invalid token | 401 | Required |
| Resource belongs to another user | 403 | Required |
| Invalid input | 400 with field errors | Required |
| Non-existent resource | 404 | Required |
| Duplicate/conflict | 409 | Required |

### Multi-tenant isolation test

This pattern is required for every resource type. User A creates a resource. User B attempts to read, update, and delete it. All three must return 403.

## Test Data Strategy

- Unit tests use inline fixtures (plain objects defined in the test file).
- Integration tests create their own data via the API as part of the test setup.
- No shared mutable fixtures — each test is fully self-contained.
- Use `Date.now()` or random suffixes in emails to avoid conflicts between parallel test runs.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npx vitest run --coverage

# Run a specific test file
npx vitest run tests/auth.test.ts
```

## CI Integration

Tests run automatically on every PR via GitHub Actions:
1. `tsc --noEmit` — type check
2. `eslint` — lint
3. `vitest run` — unit + integration tests
4. On merge to main: Playwright E2E tests
