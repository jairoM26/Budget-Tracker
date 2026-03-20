# Test Plan — Budget Tracker

| Field        | Value              |
|--------------|--------------------|
| Version      | 1.0                |
| Status       | Draft              |
| Last updated | 2026-03-19         |

---

## 1. Philosophy

This project follows the **testing pyramid**: many fast unit tests at the base, fewer integration tests in the middle, and a small number of end-to-end tests at the top. Tests are not written after the code — they are written alongside it, and in some cases before it.

Financial applications have zero tolerance for calculation errors. A bug in a budget calculation or a missing `user_id` filter is not a minor defect — it is a data integrity or security failure. The test suite reflects this: coverage of financial logic and authentication middleware is mandatory.

---

## 2. Test Levels

### 2.1 Unit tests

**What:** Individual functions and modules in isolation. No database, no HTTP, no external services.

**Tool:** Vitest

**Targets:**
- All financial calculation helpers (sum, budget vs actual, percentage)
- Input validators (Zod schemas)
- JWT generation and verification utilities
- Recurring rule scheduling logic (is a rule due today?)
- Date utilities

**Threshold:** 90% line coverage on `packages/shared` and utility modules in `apps/api/src/utils`

---

### 2.2 Integration tests

**What:** API routes tested end-to-end through HTTP, against a real test database. No browser.

**Tools:** Vitest + Supertest + a dedicated test PostgreSQL database

**Strategy:**
- Each test file spins up the Express app and connects to a test database
- Each test creates its own user via `POST /auth/register` to ensure full tenant isolation
- The test database is reset between test suites using Prisma's `deleteMany` in reverse dependency order
- No mocking of the database — we want to test the real query behaviour

**Targets — every route in the API contract must have integration tests covering:**

| Scenario                              | Priority |
|---------------------------------------|----------|
| Happy path (correct input, success)   | Required |
| Unauthenticated request returns 401   | Required |
| Resource belonging to another user returns 403 | Required |
| Invalid input returns 400 with field errors | Required |
| Non-existent resource returns 404     | Required |
| Duplicate resource returns 409        | Required |

**Special focus — multi-tenant isolation:**

Every resource endpoint must be tested with two users. User A creates a resource. User B attempts to read, update, and delete it. The test asserts 403 in all three cases. This test pattern is required for every resource type.

---

### 2.3 End-to-end tests

**What:** A real browser interacting with the running application.

**Tool:** Playwright

**Scope (v1):** Cover the critical user journeys only.

| Journey                               | Priority |
|---------------------------------------|----------|
| Register → log in → log out           | Required |
| Create a category → create a transaction → verify it appears in the list | Required |
| Create a monthly budget → add category limits → verify budget summary | Required |
| Create a recurring rule → verify it appears in the rules list | Required |
| View monthly report → verify charts render with data | Required |

---

## 3. Test Data Strategy

- Unit tests use inline fixtures (plain objects defined in the test file)
- Integration tests create their own data via the API as part of the test setup
- No shared mutable fixtures — each test is fully self-contained
- A seed script (`prisma/seed.ts`) provides default categories for development and manual testing only — never used in automated tests

---

## 4. Security Tests

The following security scenarios are treated as first-class integration tests, not optional:

| Test                                                               | Expected result |
|--------------------------------------------------------------------|-----------------|
| Request to any protected route without token                       | 401             |
| Request with a valid token but tampered payload                    | 401             |
| Request with an expired token                                      | 401             |
| User A reads User B's transaction by guessing the UUID             | 403             |
| User A updates User B's category                                   | 403             |
| User A deletes User B's budget                                     | 403             |
| Register with an email that already exists                         | 409             |
| Login with correct email but wrong password                        | 401             |

---

## 5. Definition of Done

A feature is not complete until:

- All unit tests for its business logic pass
- All integration tests for its API routes pass, including the 401/403 cases
- No TypeScript errors (`tsc --noEmit` passes)
- The relevant E2E journey passes in Playwright
- The API contract document reflects the actual behaviour of the endpoint

---

## 6. CI/CD Integration

On every push to any branch:
1. `tsc --noEmit` — type check all packages
2. `vitest run` — unit and integration tests
3. On merge to `main` only: Playwright E2E tests run against the deployed preview environment

A pull request cannot be merged if any of these steps fail.

---

## 7. Tools Summary

| Tool       | Purpose                      | Location         |
|------------|------------------------------|------------------|
| Vitest     | Unit and integration tests   | `apps/api`       |
| Supertest  | HTTP layer for integration   | `apps/api`       |
| Playwright | End-to-end browser tests     | `apps/web/e2e`   |
| Vitest     | Frontend component tests     | `apps/web`       |
