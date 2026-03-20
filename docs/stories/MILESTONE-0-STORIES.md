# Story Cards — Milestone 0: Project foundation

| Field        | Value              |
|--------------|--------------------|
| Version      | 1.1                |
| Status       | Draft — pending review |
| Last updated | 2026-03-20         |

Story IDs use the prefix **DS** (developer story) to distinguish them from user-facing stories (US-xx) in the PRD. Acceptance criteria use Given / When / Then to keep them verifiable and unambiguous.

DS-00 is the prerequisite story — it must be done before any other story is started. It has no code to write; it is purely environment verification.

---

## DS-00 — Local development environment

```
As a:     developer joining this project on any machine
I want:   a documented, verified local environment setup
So that:  I can run the full project locally within one session,
          and any new developer can reproduce the same environment
          by following a single document
```

**Acceptance criteria**

```
AC-01  Given a machine with only Docker Desktop and Node.js 20 LTS installed,
       when I follow the setup document from top to bottom,
       then the full project runs locally without installing PostgreSQL
       or any other infrastructure tool directly on the machine.

AC-02  Given the prerequisites are installed,
       when I run `node --version` and `docker compose version`,
       then node prints v20.x.x or higher and docker compose prints v2.x.

AC-03  Given the repository is cloned,
       when I run `docker compose up -d` from the root,
       then a container named `budget_postgres` starts and reaches
       a healthy status within 30 seconds.

AC-04  Given the container is healthy,
       when I run `docker exec budget_postgres psql -U budget -c "\l"`,
       then both `budget_dev` and `budget_test` databases are listed —
       no manual database creation is required.

AC-05  Given the .env files are copied from .env.example with no edits,
       when I run `npm install` from the monorepo root,
       then all dependencies install without errors.

AC-06  Given the environment is fully set up,
       when I run `npx prisma migrate dev` in apps/api,
       then the migration runs against budget_dev without errors.

AC-07  Given the environment is fully set up,
       when I run `npm run dev:api` and `npm run dev:web` concurrently,
       then both servers start, the API responds on port 3000,
       and the web app loads on port 5173.

AC-08  Given the repository root,
       when I inspect `.gitattributes`,
       then it enforces LF line endings for all .yml, .sh, .sql,
       .ts, .tsx, .prisma, and .env files — preventing Windows
       CRLF line endings from breaking containers and CI runners.

AC-09  Given the setup document,
       when a new developer follows it on Windows, macOS, or Linux,
       then all AC above pass without any operating-system-specific
       manual steps beyond installing Node.js and Docker Desktop.
```

**Required environment variables (pre-configured in .env.example)**

```
DATABASE_URL         postgresql://budget:budget_local@localhost:5432/budget_dev
TEST_DATABASE_URL    postgresql://budget:budget_local@localhost:5432/budget_test
JWT_SECRET           change-this-to-a-long-random-string-in-production
JWT_EXPIRES_IN       15m
REFRESH_TOKEN_SECRET change-this-to-another-long-random-string
NODE_ENV             development
VITE_API_URL         http://localhost:3000
```

Note: the default values match the Docker Compose configuration exactly.
A new developer does not need to edit `.env` to get the project running locally.

**Tasks linked:** T-009
**Definition of done:** all AC pass + ENVIRONMENT-SETUP.md committed to docs/

---

## DS-01 — Monorepo structure

```
As a:     developer working on this project
I want:   a single repository that hosts both applications and the shared package
So that:  I can share TypeScript types across frontend and backend without
          publishing a separate npm package, and manage everything with one
          git history
```

**Acceptance criteria**

```
AC-01  Given the repository root,
       when I run `npm install`,
       then all dependencies across apps/api, apps/web, and packages/shared
       install successfully with a single command and a single node_modules
       at the root.

AC-02  Given the monorepo is installed,
       when I run `npm run dev:api` from the root,
       then the API development server starts without errors.

AC-03  Given the monorepo is installed,
       when I run `npm run dev:web` from the root,
       then the web development server starts without errors.

AC-04  Given packages/shared exports a type,
       when I import that type in apps/api and apps/web,
       then both imports resolve correctly with full IDE autocompletion
       and no TypeScript errors.
```

**Tasks linked:** T-001, T-002
**Definition of done:** all AC pass + changes committed to main

---

## DS-02 — TypeScript configuration

```
As a:     developer working on this project
I want:   TypeScript configured in strict mode across all packages
So that:  type errors are caught at compile time before they reach runtime,
          and the codebase enforces the same standards everywhere
```

**Acceptance criteria**

```
AC-01  Given any package in the monorepo,
       when I run `tsc --noEmit` inside that package,
       then the command exits with code 0 and reports zero errors.

AC-02  Given a deliberate type error introduced in apps/api
       (e.g. assigning a string to a number field),
       when I run `tsc --noEmit`,
       then the command exits with a non-zero code and identifies the
       exact file and line of the error.

AC-03  Given the tsconfig.json files,
       when I inspect them,
       then strict mode is enabled (`"strict": true`) in all packages
       and no individual strict checks are disabled.

AC-04  Given packages/shared is built with `npm run build`,
       then a dist/ folder is generated containing both .js files
       and .d.ts declaration files that other packages can consume.
```

**Tasks linked:** T-002, T-003
**Definition of done:** all AC pass + changes committed to main

---

## DS-03 — Shared package with base types

```
As a:     developer working on this project
I want:   a shared package that exports the core domain types and enums
So that:  the frontend and backend always agree on the shape of the data
          and changes to a type are reflected everywhere at compile time
```

**Acceptance criteria**

```
AC-01  Given packages/shared/src/types/index.ts,
       when I inspect it,
       then it exports at minimum: TransactionType enum, RecurringFrequency
       enum, User interface, Category interface, Transaction interface,
       and Budget interface.

AC-02  Given the TransactionType enum,
       when I attempt to assign a value outside INCOME and EXPENSE to a
       TransactionType variable in TypeScript,
       then the compiler rejects it with a type error.

AC-03  Given packages/shared is built,
       when apps/api imports TransactionType from @budget-app/shared,
       then the import resolves and tsc --noEmit passes.

AC-04  Given packages/shared is built,
       when apps/web imports TransactionType from @budget-app/shared,
       then the import resolves and tsc --noEmit passes.
```

**Tasks linked:** T-003
**Definition of done:** all AC pass + changes committed to main

---

## DS-04 — ESLint across all packages

```
As a:     developer working on this project
I want:   a consistent linting configuration across all packages
So that:  code style issues and common mistakes are caught automatically
          before review, and the CI pipeline can enforce them
```

**Acceptance criteria**

```
AC-01  Given any package in the monorepo,
       when I run `npm run lint` from the root,
       then ESLint runs against all TypeScript files and exits with
       code 0 on a clean codebase.

AC-02  Given a deliberate lint violation introduced in apps/api
       (e.g. an unused variable declared with `let`),
       when I run `npm run lint`,
       then ESLint reports the violation with file name, line number,
       and rule name, and exits with a non-zero code.

AC-03  Given the ESLint configuration,
       when I inspect it,
       then the following rules are enabled as errors: no-unused-vars,
       no-explicit-any, no-console (warn level acceptable).

AC-04  Given apps/web,
       when I run lint,
       then React-specific rules (react-hooks/rules-of-hooks,
       react-hooks/exhaustive-deps) are also enforced.
```

**Tasks linked:** T-011
**Definition of done:** all AC pass + changes committed to main

---

## DS-05 — Express API skeleton

```
As a:     developer working on this project
I want:   a running Express server with health check, error handling,
          and environment configuration
So that:  I have a verified foundation to build routes on top of,
          and deployment targets have something to serve immediately
```

**Acceptance criteria**

```
AC-01  Given the API server is running locally,
       when I send GET /health,
       then I receive HTTP 200 with body { "status": "ok" } within 500ms.

AC-02  Given the API server is running,
       when an unhandled route is requested (e.g. GET /nonexistent),
       then I receive HTTP 404 with body { "success": false,
       "error": { "code": "NOT_FOUND", "message": "..." } }.

AC-03  Given the API server is running,
       when an internal error is thrown intentionally in a test route,
       then I receive HTTP 500 with the standard error response shape
       and the stack trace is NOT exposed in the response body.

AC-04  Given a missing required environment variable (e.g. DATABASE_URL),
       when the server starts,
       then it logs a clear error message identifying the missing variable
       and exits with a non-zero code rather than starting in a broken state.

AC-05  Given the API server is running in development mode,
       when I modify a source file,
       then the server reloads automatically without a manual restart.
```

**Tasks linked:** T-004, T-009, T-010
**Definition of done:** all AC pass + changes committed to main

---

## DS-06 — React + Vite web skeleton

```
As a:     developer working on this project
I want:   a running React application with Tailwind configured and a
          placeholder home page
So that:  I have a verified foundation to build UI components on top of,
          and the frontend deployment target has something to serve
```

**Acceptance criteria**

```
AC-01  Given the web app is running locally,
       when I open http://localhost:5173 in a browser,
       then a page renders without console errors.

AC-02  Given a Tailwind utility class applied to any element
       (e.g. className="text-blue-500"),
       when the page renders,
       then the style is applied correctly and visible in the browser.

AC-03  Given the web app is running in development mode,
       when I modify a React component,
       then the browser reflects the change without a full page reload
       (hot module replacement is working).

AC-04  Given I run `npm run build` in apps/web,
       when the build completes,
       then a dist/ folder is produced with no TypeScript or build errors.

AC-05  Given the built dist/ folder,
       when I run `npm run preview`,
       then the app is served and renders correctly at the preview URL.
```

**Tasks linked:** T-005, T-006
**Definition of done:** all AC pass + changes committed to main

---

## DS-07 — Database schema and first migration

```
As a:     developer working on this project
I want:   the Prisma schema defined and the first migration applied
          to a local PostgreSQL database
So that:  all tables, enums, constraints, and relationships exist
          exactly as designed, and the migration history is tracked in git
```

**Acceptance criteria**

```
AC-01  Given the Prisma schema,
       when I run `npx prisma migrate dev --name init`,
       then the migration completes without errors and all six models
       (User, Category, Budget, BudgetCategory, Transaction,
       RecurringRule) exist as tables in the database.

AC-02  Given the database after migration,
       when I inspect the TransactionType column on the Transaction table,
       then it is a PostgreSQL enum type accepting only INCOME and EXPENSE,
       and any attempt to insert another value is rejected by the database.

AC-03  Given the database after migration,
       when I attempt to insert a Transaction with a categoryId that does
       not exist in the Category table,
       then the database rejects the insert with a foreign key violation.

AC-04  Given the database after migration,
       when I attempt to insert a second Budget row with the same
       userId, year, and month as an existing row,
       then the database rejects the insert with a unique constraint
       violation.

AC-05  Given the Prisma schema,
       when I run `npx prisma generate`,
       then the Prisma Client is generated and `tsc --noEmit` in apps/api
       passes with no errors.

AC-06  Given the migration files in prisma/migrations/,
       when I inspect the git history,
       then the migration SQL file is committed alongside the schema change
       that produced it.

AC-07  Given the database after migration,
       when I inspect the columns on Category, Transaction, Budget,
       and RecurringRule tables,
       then each table has a user_id column that is NOT NULL and has
       a foreign key constraint referencing the User table — no row
       in any of these tables can exist without an owner.

AC-08  Given the database after migration,
       when I attempt to insert a BudgetCategory row with the same
       budgetId and categoryId as an existing row,
       then the database rejects the insert with a unique constraint
       violation, preventing duplicate category limits in one budget.

AC-09  Given the database after migration,
       when a User row is deleted,
       then all related rows in Category, Transaction, Budget, and
       RecurringRule are automatically deleted via CASCADE,
       leaving no orphaned rows behind.
```

**Tasks linked:** T-007, T-008
**Definition of done:** all AC pass + migration file committed to main

---

## DS-08 — GitHub repository and branch protection

```
As a:     developer working on this project
I want:   a GitHub repository with branch protection rules on main
So that:  no code reaches main without passing the CI pipeline,
          and the git history is clean and traceable
```

**Acceptance criteria**

```
AC-01  Given the GitHub repository,
       when I attempt to push directly to main from the command line,
       then the push is rejected with a branch protection error.

AC-02  Given the GitHub repository,
       when I open a pull request targeting main,
       then GitHub requires the CI workflow to pass before the
       merge button is enabled.

AC-03  Given the repository,
       when I inspect the branches,
       then main exists, is the default branch, and has at least the
       initial project structure committed.

AC-04  Given the repository,
       when I inspect the root,
       then a .gitignore file exists that excludes node_modules/,
       dist/, .env, and *.tsbuildinfo.

AC-05  Given the repository,
       when I inspect .github/,
       then a PULL_REQUEST_TEMPLATE.md file exists containing the
       agreed PR checklist.
```

**Tasks linked:** T-011, T-012, T-017
**Definition of done:** all AC pass + protection rules confirmed active on GitHub

---

## DS-09 — CI pipeline (GitHub Actions)

```
As a:     developer working on this project
I want:   a CI pipeline that runs automatically on every pull request
So that:  type errors, lint violations, and failing tests are caught
          before any code merges to main, giving me confidence that
          main is always in a deployable state
```

**Acceptance criteria**

```
AC-01  Given a pull request opened against main,
       when the PR is created,
       then the CI workflow starts automatically within 60 seconds.

AC-02  Given a PR that introduces a TypeScript type error,
       when the CI pipeline runs Stage 1 (type check),
       then the pipeline fails at that stage, reports the error,
       and does not proceed to later stages.

AC-03  Given a PR that introduces an ESLint violation,
       when the CI pipeline runs Stage 2 (lint),
       then the pipeline fails at that stage and reports the rule
       and file that caused the failure.

AC-04  Given a PR with a failing unit test,
       when the CI pipeline runs Stage 3 (unit tests),
       then the pipeline fails and reports which test failed and why.

AC-05  Given a PR with a failing integration test,
       when the CI pipeline runs Stage 4 (integration tests),
       then the pipeline fails and reports the failing test, including
       any database error that caused it.

AC-06  Given a PR where all stages pass,
       when the full CI run completes,
       then GitHub marks the status check as passed and the merge
       button becomes available.

AC-07  Given a merge to main where all CI stages pass,
       when the merge completes,
       then the E2E workflow triggers automatically and runs the
       Playwright critical journey tests.

AC-08  Given the CI workflow file,
       when I inspect it,
       then no secrets or credentials are hardcoded — all sensitive
       values are referenced via GitHub Actions secrets.
```

**Tasks linked:** T-013, T-014
**Definition of done:** all AC pass + verified by opening and merging a real test PR

---

## DS-10 — Cloud deployment (Vercel + Render)

```
As a:     developer working on this project
I want:   the frontend deployed to Vercel and the API deployed to Render,
          both triggered automatically by merges to main
So that:  there is always a live environment reflecting the current state
          of main, and I can verify features in a real deployment context
```

**Acceptance criteria**

```
AC-01  Given a merge to main,
       when Vercel detects the push,
       then a new frontend deployment starts automatically and
       completes successfully within 5 minutes.

AC-02  Given the deployed frontend URL,
       when I open it in a browser,
       then the React app loads and renders without console errors.

AC-03  Given a merge to main,
       when Render detects the push,
       then a new API deployment starts automatically and
       completes successfully.

AC-04  Given the deployed API URL,
       when I send GET /health,
       then I receive HTTP 200 with { "status": "ok" }.

AC-05  Given the Render PostgreSQL instance,
       when the API starts after deployment,
       then Prisma migrations run automatically and all tables exist
       in the production database.

AC-06  Given the deployment configuration,
       when I inspect Render and Vercel dashboards,
       then no environment variables contain plaintext secrets visible
       in logs — all secrets are stored as encrypted environment
       variables in each platform's settings.
```

**Tasks linked:** T-015, T-016, T-018
**Definition of done:** all AC pass + both live URLs confirmed working after a real merge

---

## Story dependency order

The cards must be worked in this sequence. A story is not started until all its dependencies are done.

```
DS-00 (environment setup)           ← must be done first on any machine
  └── DS-01 (monorepo)
        └── DS-02 (TypeScript)
              ├── DS-03 (shared types)
              ├── DS-04 (ESLint)
              ├── DS-05 (API skeleton)
              └── DS-06 (web skeleton)
                    └── DS-07 (database schema)   ← depends on DS-05
DS-08 (GitHub repo)                               ← can start after DS-01
  └── DS-09 (CI pipeline)                        ← depends on DS-02–DS-06
        └── DS-10 (cloud deployment)
```

Milestone 0 is complete when all eleven stories are in "done" status and the CI pipeline has passed on at least one real pull request.
