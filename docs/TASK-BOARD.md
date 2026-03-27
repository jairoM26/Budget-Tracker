# Task Board — Budget Tracker

| Field        | Value              |
|--------------|--------------------|
| Version      | 1.2                |
| Last updated | 2026-03-26         |

---

## Sizing Guide

Tasks are sized by **relative complexity and uncertainty**, not time. Use past completed tasks as anchors once the project is underway.

| Size | Meaning                                                              |
|------|----------------------------------------------------------------------|
| XS   | Trivial. Scope is fully clear, no unknowns, no decisions to make     |
| S    | Small. Clear scope, one concept to implement or learn                |
| M    | Medium. Some unknowns or multiple interacting parts                  |
| L    | Large. Significant unknowns or requires learning a new pattern       |
| XL   | Too large — must be broken down before work starts                   |

**Rules:**
- No XL task may enter "in progress" — decompose it first
- If a task grows during implementation, stop and re-size it
- A task includes writing its tests — testing is not a separate task unless noted

**Status values:** `todo` · `in progress` · `done` · `blocked`

---

## Open Questions resolved

| ID    | Question                                               | Decision                                                                 |
|-------|--------------------------------------------------------|--------------------------------------------------------------------------|
| OQ-02 | What happens to transactions if a category is deleted? | Block deletion. Return 409 with count of linked transactions. UI prompts user to reassign before deleting. |
| OQ-03 | Where does the scheduler run?                          | As a cron job inside the Express server for v1. Extracted to a worker process in v2 if needed. |

---

## Milestone 0 — Project foundation

> Goal: working repository, CI pipeline, shared types, and deployable skeleton with no features.

| ID    | Task                                                           | Size | Status | Depends on |
|-------|----------------------------------------------------------------|------|--------|------------|
| T-001 | Create monorepo folder structure and root `package.json`       | S    | done   | —          |
| T-002 | Configure TypeScript for all packages                          | S    | done   | T-001      |
| T-003 | Set up `packages/shared` with base types and enums             | S    | done   | T-002      |
| T-004 | Initialise Express app skeleton in `apps/api`                  | S    | done   | T-002      |
| T-005 | Initialise React + Vite app in `apps/web`                      | S    | done   | T-002      |
| T-006 | Configure Tailwind CSS in `apps/web`                           | XS   | done   | T-005      |
| T-007 | Write Prisma schema (all models and enums)                     | M    | done   | T-004      |
| T-008 | Run first migration against local PostgreSQL                   | S    | done   | T-007      |
| T-009 | Add `.env.example` with all required environment variables     | XS   | done   | T-008      |
| T-010 | Set up Vitest in `apps/api`                                    | S    | done   | T-004      |
| T-011 | Set up ESLint across all packages                              | S    | done   | T-002      |
| T-012 | Create GitHub repository and push initial commit               | XS   | done   | T-001      |
| T-013 | Configure GitHub Actions CI workflow (Stages 1–4)              | M    | done   | T-012      |
| T-014 | Configure GitHub Actions E2E workflow (Stage 5)                | S    | done   | T-013      |
| T-015 | Configure Render service (API + PostgreSQL)                    | S    | done   | T-012      |
| T-016 | Configure Vercel project (frontend) with auto-deploy           | S    | done   | T-012      |
| T-017 | Add PR template with checklist to `.github/`                   | XS   | done   | T-012      |
| T-018 | Verify full pipeline runs green on a dummy PR                  | S    | done   | T-016      |

---

## Milestone 1 — Authentication

> Goal: a user can register, log in, refresh their session, and log out. All subsequent milestones depend on this.

| ID    | Task                                                           | Size | Status | Depends on |
|-------|----------------------------------------------------------------|------|--------|------------|
| T-020 | Implement `POST /auth/register` with bcrypt hashing            | M    | done   | T-008      |
| T-021 | Implement `POST /auth/login` with JWT generation               | S    | done   | T-020      |
| T-022 | Implement refresh token (httpOnly cookie, rotation)            | L    | done   | T-021      |
| T-023 | Implement `POST /auth/logout`                                  | XS   | done   | T-022      |
| T-024 | Write auth middleware (validate JWT on all protected routes)   | S    | done   | T-021      |
| T-025 | Integration tests: all auth routes + 401 cases                 | M    | done   | T-024      |
| T-026 | Build register and login forms in React                        | M    | done   | T-005      |
| T-027 | Implement auth context and in-memory token storage             | M    | done   | T-026      |
| T-028 | Implement protected route wrapper and auto-refresh logic       | M    | done   | T-027      |
| T-029 | E2E test: register → login → logout journey                    | S    | done   | T-028      |

---

## Milestone 2 — Categories

> Goal: authenticated users can manage their own categories.

| ID    | Task                                                           | Size | Status | Depends on |
|-------|----------------------------------------------------------------|------|--------|------------|
| T-030 | Implement `GET /categories`                                    | XS   | done   | T-024      |
| T-031 | Implement `POST /categories` with Zod validation               | S    | done   | T-030      |
| T-032 | Implement `PATCH /categories/:id` with ownership check         | S    | done   | T-031      |
| T-033 | Implement `DELETE /categories/:id` — block if transactions linked, return count | S | done | T-032 |
| T-034 | Write Prisma seed for default categories                       | XS   | done   | T-008      |
| T-035 | Integration tests: CRUD + 401/403/409 + multi-tenant isolation | M    | done   | T-033      |
| T-036 | Build category management UI with reassign flow before delete  | M    | done   | T-028      |

---

## Milestone 3 — Transactions

> Goal: authenticated users can record, edit, delete, and filter transactions.

| ID    | Task                                                           | Size | Status | Depends on |
|-------|----------------------------------------------------------------|------|--------|------------|
| T-040 | Implement `GET /transactions` with filters and pagination      | M    | done   | T-024      |
| T-041 | Implement `POST /transactions` with validation                 | S    | done   | T-040      |
| T-042 | Implement `PATCH /transactions/:id` with ownership check       | S    | done   | T-041      |
| T-043 | Implement `DELETE /transactions/:id`                           | XS   | done   | T-042      |
| T-044 | Integration tests: CRUD + filters + pagination + 401/403       | L    | done   | T-043      |
| T-045 | Build transaction list UI with filters and pagination          | L    | done   | T-028      |
| T-046 | Build add/edit transaction form                                | M    | done   | T-045      |
| T-047 | E2E test: create → view → edit → delete transaction journey    | S    | done   | T-046      |

---

## Milestone 4 — Budgets

> Goal: users can define monthly budgets with per-category limits and see real-time spending.

| ID    | Task                                                           | Size | Status | Depends on |
|-------|----------------------------------------------------------------|------|--------|------------|
| T-050 | Implement `GET /budgets` with calculated `spent` per category  | M    | done   | T-040      |
| T-051 | Implement `POST /budgets` with category limits                 | M    | done   | T-050      |
| T-052 | Implement `PATCH /budgets/:id`                                 | S    | done   | T-051      |
| T-053 | Implement `DELETE /budgets/:id`                                | XS   | done   | T-052      |
| T-054 | Unit tests: budget vs actual calculation and percentage logic  | S    | done   | T-051      |
| T-055 | Integration tests: CRUD + 401/403/409 + spent calculation      | M    | done   | T-054      |
| T-056 | Build budget management UI with progress indicators            | L    | done   | T-028      |

---

## Milestone 5 — Recurring rules

> Goal: users can define recurring transactions; the scheduler creates them automatically on schedule.

| ID    | Task                                                           | Size | Status | Depends on |
|-------|----------------------------------------------------------------|------|--------|------------|
| T-060 | Implement `GET/POST/PATCH/DELETE /recurring-rules`             | M    | done   | T-041      |
| T-061 | Write scheduler logic: determine which rules are due today     | M    | done   | T-060      |
| T-062 | Unit tests: scheduler due-date logic for all frequencies       | M    | done   | T-061      |
| T-063 | Integrate scheduler as daily cron job inside Express server    | S    | done   | T-062      |
| T-064 | Integration tests: rules CRUD + scheduler generates transactions | M  | done   | T-063      |
| T-065 | Build recurring rules UI                                       | M    | done   | T-028      |

---

## Milestone 6 — Reports

> Goal: users can view monthly summaries and charts.

| ID    | Task                                                           | Size | Status | Depends on |
|-------|----------------------------------------------------------------|------|--------|------------|
| T-070 | Implement `GET /reports/monthly-summary`                       | S    | done   | T-040      |
| T-071 | Implement `GET /reports/spending-by-category`                  | S    | done   | T-050      |
| T-072 | Implement `GET /reports/monthly-trend`                         | S    | done   | T-040      |
| T-073 | Integration tests: all three report endpoints with edge cases  | M    | done   | T-072      |
| T-074 | Build monthly summary dashboard with Recharts                  | M    | done   | T-046      |
| T-075 | Build spending by category chart (donut + bar)                 | M    | done   | T-074      |
| T-076 | Build monthly trend line chart (last 6 months)                 | S    | done   | T-074      |

---

## Backlog — Deferred requests

| ID    | Task                                                           | Size | Status | Notes |
|-------|----------------------------------------------------------------|------|--------|-------|
| T-B01 | Change password — settings page with current password verification | S | todo | Requires `POST /auth/change-password` endpoint + settings UI |

---

## Milestone 7 — Polish and hardening

> Goal: the app is stable, secure, and handles all edge cases gracefully.

| ID    | Task                                                           | Size | Status | Depends on |
|-------|----------------------------------------------------------------|------|--------|------------|
| T-080 | Add rate limiting middleware to auth routes                    | S    | done   | T-025      |
| T-081 | Add global error handler middleware in Express                 | S    | done   | T-004      |
| T-082 | Add request logging middleware                                 | XS   | done   | T-004      |
| T-083 | Add database indexes for all `user_id` and date filter columns | S   | done   | T-040      |
| T-084 | Responsive design audit and mobile layout fixes                | M    | done   | T-076      |
| T-085 | Security review: manual audit of every route for ownership checks | M | done   | T-076      |
| T-086 | Full Playwright E2E suite for all critical user journeys       | L    | done   | T-076      |

---

## Milestone 8 — Agentic phase (v2)

> Goal: AI-powered features — email-based transaction ingestion with user-defined rules and AI extraction, plus smart category suggestion. See ADR-09 for architectural decisions.

| ID    | Task                                                           | Size | Status | Depends on  |
|-------|----------------------------------------------------------------|------|--------|-------------|
| T-090 | Design and document email ingestion pipeline (ADR-09)          | M    | done   | M7 complete |
| T-091 | Prisma schema: EmailConnection, ScanRule, EmailLog, PendingTransaction models + migration | M | todo | T-090 |
| T-092 | Implement email connection service (IMAP via imapflow + Gmail API OAuth) | L | todo | T-091 |
| T-093 | Implement scan rule engine: connect, search by subject filter, fetch new emails since last sync | M | todo | T-092 |
| T-094 | Build AI extraction service: email body → structured transaction (Claude Sonnet, tool use) | M | todo | T-093 |
| T-095 | Build AI category suggestion: history-based matching with Claude fallback | M | todo | T-091 |
| T-096 | Implement PendingTransaction CRUD + approve/reject endpoints (approve creates real transaction) | M | todo | T-094 |
| T-097 | Integrate daily cron job for email sync + manual "Sync now" endpoint | S | todo | T-094 |
| T-098 | Build email connection settings UI (connect email, manage scan rules, preview extraction) | L | todo | T-093 |
| T-099 | Build review queue UI with approve/edit/reject + batch operations | M | todo | T-096 |
| T-100 | Integrate category suggestion into TransactionForm (debounced, with "Suggested" badge) | S | todo | T-095 |
| T-101 | Integration tests: email sync, AI extraction (mocked), pending transaction CRUD, approve flow | M | todo | T-097 |
| T-102 | E2E tests: settings → connect email → review queue → approve transaction journey | S | todo | T-100 |

---

## Size distribution summary

| Milestone             | XS | S  | M  | L | Total tasks |
|-----------------------|----|----|----|---|-------------|
| 0 — Foundation        | 3  | 10 | 3  | 0 | 18          |
| 1 — Authentication    | 1  | 4  | 5  | 1 | 10          |
| 2 — Categories        | 2  | 3  | 2  | 0 | 7           |
| 3 — Transactions      | 1  | 3  | 2  | 2 | 8           |
| 4 — Budgets           | 1  | 3  | 3  | 1 | 7           |
| 5 — Recurring rules   | 0  | 1  | 4  | 0 | 6           |
| 6 — Reports           | 0  | 4  | 3  | 0 | 7           |
| 7 — Polish            | 1  | 3  | 3  | 1 | 7           |
| **v1 total**          | **9** | **31** | **25** | **5** | **70** |
| 8 — Agentic (v2)      | 0  | 3  | 7  | 2 | 13          |
