# Budget Tracker — CLAUDE.md

## Project Overview

Multi-tenant web application for tracking income, expenses, and monthly budgets. Users manage their own categories, transactions, budgets, and recurring rules. All data is isolated per user via `userId` on every table and query.

## Tech Stack

- **Monorepo** with npm workspaces: `apps/api`, `apps/web`, `packages/shared`
- **Backend:** Express.js + TypeScript + Prisma ORM + PostgreSQL
- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts
- **Shared:** TypeScript types and enums in `packages/shared`
- **Auth:** Custom JWT (bcrypt + jsonwebtoken), refresh tokens in httpOnly cookies
- **Validation:** Zod schemas for all request bodies
- **Testing:** Vitest + Supertest (unit + integration), Playwright (E2E)
- **CI/CD:** GitHub Actions → Vercel (frontend) + Render (backend + PostgreSQL)

## Commands

```bash
# Install all dependencies
npm install

# Development
npm run dev:api          # Express API on port 3000
npm run dev:web          # Vite dev server on port 5173

# Build
npm run build            # Build shared → api → web

# Quality checks
npm run typecheck         # tsc --noEmit across all packages
npm run lint              # ESLint across all packages
npm run test              # Vitest unit + integration tests

# Database
cd apps/api
npx prisma migrate dev    # Run migrations
npx prisma generate       # Regenerate client after schema changes
npx prisma studio         # Visual database browser

# Docker (local PostgreSQL)
docker compose up -d      # Start budget_postgres container
docker compose down       # Stop container
```

## Architecture Rules

1. **Three-layer backend:** Routes → Controllers → Services. Business logic lives in services, not controllers.
2. **Multi-tenant isolation:** Every query is scoped by `userId` from the JWT. Never trust `userId` from request bodies.
3. **Standard response envelope:** `{ success: true, data }` or `{ success: false, error: { code, message, fields? } }`
4. **Monetary values:** Always strings with 2 decimal places (e.g., `"1250.00"`). Stored as `Decimal(12,2)` in PostgreSQL.
5. **Validation first:** All inputs validated with Zod before touching the database. Use `safeParse`, not `parse`.
6. **Error handling:** Custom `AppError` classes. Global error handler catches all. Never expose stack traces.

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/prisma/schema.prisma` | Database schema (source of truth) |
| `apps/api/src/index.ts` | Express app bootstrap |
| `apps/web/src/App.tsx` | React root component |
| `packages/shared/src/types/index.ts` | Shared TypeScript types |
| `docs/PRD.md` | Product requirements |
| `docs/api/API-CONTRACT.md` | Full API specification |
| `docs/TASK-BOARD.md` | All tasks and milestones |
| `docs/TEST-PLAN.md` | Testing strategy |
| `docs/adr/ADRs.md` | Architecture decisions |

## Skills

Project-specific skills are in `.claude/skills/`. Consult the relevant skill before implementing:

- **express-api** — Route/controller/service patterns, error handling, middleware order
- **prisma-data-layer** — Query patterns, ownership checks, Decimal handling, migrations
- **zod-validation** — Schema conventions, validation middleware, monetary amounts
- **jwt-auth** — Auth flow, bcrypt, token generation, refresh rotation, security rules
- **vitest-testing** — Test pyramid, integration test patterns, test helpers, required scenarios
- **react-frontend** — Component structure, AuthContext, protected routes, API client, Tailwind

## Conventions

- TypeScript strict mode everywhere. No `any`, no `@ts-ignore`.
- ESLint: no-unused-vars (error), no-explicit-any (error), no-console (warn)
- One file per concern. PascalCase for components, camelCase for utilities.
- Tests live alongside code (unit) or in `tests/` directory (integration).
- Every PR must pass: typecheck → lint → tests before merge.

## Testing Rules

- **Tests are not optional.** Every PR must include tests for the code it introduces. No exceptions.
- **Never modify code just to make a test pass.** If a test fails, analyze the root cause first. The fix must address the real problem — not paper over it. If the test itself is wrong, fix the test and explain why.
- **Failing tests block the PR.** A PR with failing tests is not ready for review, regardless of how small the change is.

## Current Status

Milestone 0 (Foundation) scaffold is complete. All tasks on the board are `todo`. Next milestone: **Milestone 1 — Authentication**.
