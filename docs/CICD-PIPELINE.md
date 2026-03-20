# CI/CD Pipeline — Budget Tracker

| Field        | Value              |
|--------------|--------------------|
| Version      | 1.0                |
| Status       | Accepted           |
| Last updated | 2026-03-19         |

---

## 1. Philosophy

Every change to the codebase must pass through an automated quality gate before it reaches production. No exceptions. The pipeline is not a bureaucratic step — it is the team's shared definition of "this works."

The pipeline is designed around one rule: **if it would embarrass you in production, the pipeline catches it first.**

---

## 2. Branching Strategy

We use **GitHub Flow** — the simplest branching model that supports safe continuous delivery.

```
main
 └── feature/T-020-auth-register
 └── feature/T-040-transactions-api
 └── fix/T-044-pagination-off-by-one
```

| Branch type | Naming convention         | Merges into | Direct push allowed? |
|-------------|---------------------------|-------------|----------------------|
| `main`      | —                         | —           | No — PRs only        |
| `feature/*` | `feature/T-{id}-short-description` | `main` | Yes            |
| `fix/*`     | `fix/T-{id}-short-description` | `main`  | Yes                  |

Rules on `main`:
- Direct pushes are blocked — all changes go through a pull request
- At least one passing CI run is required before merge
- The branch must be up to date with `main` before merge

---

## 3. Pipeline Stages

The pipeline runs on every pull request targeting `main`, and again on every merge to `main`.

```
PR opened / commit pushed
        │
        ▼
┌─────────────────┐
│   Stage 1       │  Type check
│   tsc --noEmit  │  All packages must compile with zero errors
└────────┬────────┘
         │ pass
         ▼
┌─────────────────┐
│   Stage 2       │  Lint
│   ESLint        │  No lint errors (warnings allowed)
└────────┬────────┘
         │ pass
         ▼
┌─────────────────┐
│   Stage 3       │  Unit tests
│   Vitest        │  All unit tests pass
│                 │  Coverage threshold enforced (90% on utils)
└────────┬────────┘
         │ pass
         ▼
┌─────────────────┐
│   Stage 4       │  Integration tests
│   Vitest +      │  All API route tests pass
│   Supertest     │  Runs against a temporary PostgreSQL container
└────────┬────────┘
         │ pass (on merge to main only)
         ▼
┌─────────────────┐
│   Stage 5       │  E2E tests
│   Playwright    │  Critical user journeys pass
│                 │  Runs against deployed preview environment
└────────┬────────┘
         │ pass (on merge to main only)
         ▼
┌─────────────────┐
│   Stage 6       │  Deploy
│   Vercel        │  Frontend deployed automatically by Vercel
│   Render        │  Backend deployed via Render GitHub integration
└─────────────────┘
```

**Stages 1–4 run on every PR.** A PR cannot be merged if any of these fail.

**Stages 5–6 run only on merge to `main`.** E2E tests are slower and require a deployed environment, so they run after merge rather than blocking it. If Stage 5 fails after merge, the on-call developer (you) reverts the merge immediately.

---

## 4. GitHub Actions Configuration

The pipeline is implemented as two workflow files.

### `.github/workflows/ci.yml` — runs on every PR

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: budget_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck --workspaces --if-present

      - name: Lint
        run: npm run lint --workspaces --if-present

      - name: Run migrations on test DB
        run: npx prisma migrate deploy
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/budget_test

      - name: Unit and integration tests
        run: npm run test --workspace=apps/api
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/budget_test
          JWT_SECRET: ci-test-secret-not-for-production
          JWT_EXPIRES_IN: 15m
          REFRESH_TOKEN_SECRET: ci-refresh-secret
          NODE_ENV: test
```

### `.github/workflows/e2e.yml` — runs on merge to main

```yaml
name: E2E

on:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
        working-directory: apps/web

      - name: Run E2E tests
        run: npx playwright test
        working-directory: apps/web
        env:
          BASE_URL: ${{ secrets.PREVIEW_URL }}
```

---

## 5. Environment Variables

No secret ever lives in the repository. All secrets are stored in GitHub Actions secrets and injected at runtime.

| Variable                | Used in    | Description                              |
|-------------------------|------------|------------------------------------------|
| `DATABASE_URL`          | API        | PostgreSQL connection string             |
| `JWT_SECRET`            | API        | Secret for signing access tokens         |
| `JWT_EXPIRES_IN`        | API        | Access token lifetime (e.g. `15m`)       |
| `REFRESH_TOKEN_SECRET`  | API        | Secret for signing refresh tokens        |
| `VITE_API_URL`          | Web        | Base URL of the API (set at build time)  |
| `PREVIEW_URL`           | CI (E2E)   | URL of the deployed preview environment  |

A `.env.example` file in each app documents which variables are required, with placeholder values. Developers copy this to `.env` locally and fill in their own values. The `.env` file is in `.gitignore` and is never committed.

---

## 6. Pull Request Checklist

Every pull request description must include this checklist. It is not bureaucracy — it is a communication contract between the author and the reviewer (even when the reviewer is future-you).

```markdown
## What this PR does
<!-- One or two sentences describing the change -->

## Task
<!-- Link to the task ID, e.g. T-020 -->

## Type of change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Tests only

## Checklist
- [ ] All CI stages pass
- [ ] New code has tests (unit or integration)
- [ ] The API contract document is updated if endpoints changed
- [ ] No secrets or credentials in the code
- [ ] I tested this manually in a local environment
```

---

## 7. Definition of a Deployable Main Branch

The `main` branch must always be in a state that can be deployed to production at any moment. This means:

- All CI stages pass on the latest commit
- The database schema is consistent with the deployed migration history
- No feature flags are needed to keep partially-built features from breaking the app — incomplete features are hidden behind UI gates, not broken endpoints

---

## 8. Revision History

| Version | Date       | Change              |
|---------|------------|---------------------|
| 1.0     | 2026-03-19 | Initial draft       |
