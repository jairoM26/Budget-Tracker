# ADR-01 — Monorepo structure

| Field   | Value              |
|---------|--------------------|
| Date    | 2026-03-19         |
| Status  | Accepted           |

## Decision

Organise the entire project as a single git repository containing multiple packages under `apps/` and `packages/`.

## Context

The project has two distinct applications (a React frontend and an Express backend) that share domain types and validation logic. They will be developed and deployed together by a single developer, at least in v1.

## Alternatives considered

**Separate repositories** — one repo per service. Standard in large organisations with separate teams per service. Rejected because it adds friction for a solo developer: type sharing requires publishing packages, changes that span both apps require coordinated pull requests across two repositories, and CI/CD becomes more complex with no benefit at this scale.

## Consequences

- TypeScript types defined in `packages/shared` are imported by both `apps/api` and `apps/web`, eliminating an entire class of frontend/backend contract bugs
- A single `npm install` at the root installs all dependencies
- A single git history captures the full context of every change
- As the team grows, workspaces can be extracted into separate repositories with minimal refactoring

---

# ADR-02 — TypeScript across the full stack

| Field   | Value              |
|---------|--------------------|
| Date    | 2026-03-19         |
| Status  | Accepted           |

## Decision

Use TypeScript for all code in all packages — frontend, backend, and shared.

## Context

The developer has a background in C/C++ and Python, where type systems are either enforced at compile time or inferred. JavaScript's dynamic typing introduces a category of bugs that are caught at runtime rather than during development.

## Alternatives considered

**JavaScript only** — simpler initial setup, no compilation step. Rejected because type safety across the API boundary (shared types between client and server) is the primary reason for the monorepo structure. Without TypeScript, that benefit disappears.

**Python backend (FastAPI)** — the developer is more familiar with Python. Rejected because using the same language on both sides reduces context switching, enables shared types, and aligns better with the goal of learning full-stack JavaScript patterns for career purposes.

## Consequences

- Bugs from mismatched API contracts between frontend and backend are caught at compile time
- The shared package can export types that are consumed by both apps with full IDE autocompletion
- A TypeScript compilation step is required; `ts-node-dev` removes this friction in development
- Strict mode is enabled — this is intentional and will occasionally require extra type annotations

---

# ADR-03 — PostgreSQL as the database

| Field   | Value              |
|---------|--------------------|
| Date    | 2026-03-19         |
| Status  | Accepted           |

## Decision

Use PostgreSQL as the sole data store.

## Context

The application manages financial data: transactions, budgets, and recurring rules. This data is highly relational — a transaction belongs to a user, references a category, and optionally references a recurring rule. Consistency and correctness matter more than write throughput.

## Alternatives considered

**MongoDB** — document-oriented, flexible schema, popular in Node.js tutorials. Rejected because financial data is naturally relational and highly structured. Flexible schema is a liability here, not an asset — a transaction should always have an amount and a type, and the database should enforce that.

**SQLite** — zero infrastructure, file-based. Rejected because it does not scale to multiple concurrent connections in a hosted environment, and Render's free tier provides PostgreSQL natively.

## Consequences

- Referential integrity is enforced at the database level (foreign keys, cascades)
- Multi-tenant isolation is enforced by `user_id` on every table and every query — this is a discipline the application code must maintain consistently
- Render's free PostgreSQL tier has a 1 GB storage limit and sleeps after inactivity — acceptable for v1
- Decimal precision (`DECIMAL(12,2)`) ensures financial amounts are stored exactly, with no floating-point errors

---

# ADR-04 — Prisma as the ORM

| Field   | Value              |
|---------|--------------------|
| Date    | 2026-03-19         |
| Status  | Accepted           |

## Decision

Use Prisma as the database access layer.

## Context

The backend needs to query and mutate a PostgreSQL database from TypeScript code. The choice of ORM affects developer experience, type safety, and migration management.

## Alternatives considered

**Raw SQL with `pg`** — maximum control, no abstraction overhead. Rejected because it requires manually writing migration files, managing connection pooling, and writing repetitive query boilerplate. The type safety benefit is lost unless a code generator is added separately.

**TypeORM** — mature, decorator-based ORM. Rejected because its decorator pattern conflicts with strict TypeScript mode and its migration tooling is less reliable than Prisma's.

**Drizzle ORM** — newer, lightweight, fully type-safe. A strong alternative. Rejected in favour of Prisma because Prisma has broader community adoption, better documentation, and a more established migration workflow — better suited to learning purposes.

## Consequences

- `prisma/schema.prisma` is the single source of truth for the data model
- `prisma migrate dev` manages schema evolution with versioned migration files committed to git
- The generated Prisma Client provides fully type-safe queries — passing a wrong field type is a compile-time error
- Prisma does not support all PostgreSQL-specific features natively; raw queries are available as an escape hatch

---

# ADR-05 — Custom JWT authentication with bcrypt

| Field   | Value              |
|---------|--------------------|
| Date    | 2026-03-19         |
| Status  | Accepted           |

## Decision

Implement authentication from scratch using `jsonwebtoken` for token generation and `bcryptjs` for password hashing. Do not use a third-party authentication service.

## Context

The application requires multi-tenant authentication. Every authenticated request must be scoped to a specific user. This decision has security implications.

## Alternatives considered

**Auth0 free tier** — managed authentication, OAuth 2.0, social login. Rejected in favour of the custom implementation because the primary goal of this project is learning. A developer who can explain how JWT validation, token expiry, refresh token rotation, and bcrypt cost factors work is significantly more valuable in a senior interview than one who can configure an Auth0 dashboard.

**Passport.js** — middleware abstraction over authentication strategies. Rejected because it adds a layer of abstraction that obscures the underlying mechanism, which is precisely what we want to understand.

## Implementation notes

- Passwords are hashed with bcrypt at a cost factor of 12 (approximately 250ms per hash on modern hardware — slow enough to resist brute force, fast enough not to degrade the user experience)
- Access tokens expire after 15 minutes
- Refresh tokens are stored in an `httpOnly` cookie and expire after 7 days
- Tokens are validated in a middleware function applied to all protected routes
- The `user_id` claim extracted from the token is the authoritative source of the requesting user's identity — it is never taken from the request body

## Consequences

- We own the full authentication implementation and are responsible for its security
- Token refresh logic must be implemented on the frontend
- If a vulnerability is discovered, we patch it ourselves — no vendor fix available
- The developer gains a thorough understanding of authentication mechanics

---

# ADR-06 — React with Vite for the frontend

| Field   | Value              |
|---------|--------------------|
| Date    | 2026-03-19         |
| Status  | Accepted           |

## Decision

Use React 18 with Vite as the build tool. Use Tailwind CSS for styling. Use Recharts for data visualisation.

## Context

The frontend must be a single-page application that works on desktop and mobile browsers, renders charts, and can realistically be ported to React Native in a future version.

## Alternatives considered

**Next.js** — React with server-side rendering. Rejected for v1 because the application is entirely authenticated — there is no public page that benefits from SSR. Next.js adds complexity (server components, routing conventions) that is not needed here.

**Vue or Svelte** — strong alternatives with good ecosystems. Rejected because React is the dominant framework in the job market the developer is targeting, and React Native is the natural mobile extension path.

## Consequences

- Vite's development server provides hot module replacement with no configuration
- Tailwind's utility classes generate a minimal CSS bundle with no unused styles in production
- Recharts is built on D3 and works natively with React's rendering model
- The React component structure will mirror React Native's component model closely enough that a future mobile port is feasible with shared business logic

---

# ADR-07 — Free tier deployment on Vercel and Render

| Field   | Value              |
|---------|--------------------|
| Date    | 2026-03-19         |
| Status  | Accepted           |

## Decision

Deploy the React frontend to Vercel and the Express API plus PostgreSQL database to Render, both on free tiers.

## Context

The application is a personal learning project. There is no budget for infrastructure. The deployment choice must support the full stack with zero cost.

## Alternatives considered

**Railway** — developer-friendly, free tier available. A strong alternative. Render was preferred because its PostgreSQL free tier is more generous for this use case.

**AWS / GCP / Azure** — professional-grade infrastructure. Rejected at this stage because free tier complexity (IAM, VPCs, billing alarms) would distract from the application development goals.

## Consequences

- Render's free API service sleeps after 15 minutes of inactivity — the first request after sleep takes 30–60 seconds. This is acceptable for a personal project but must be documented
- Render's free PostgreSQL instance has a 1 GB storage limit and a 90-day expiry — a paid instance or migration must be planned before the 90-day mark
- Vercel's free tier supports unlimited personal projects with no cold start for static assets
- Deployment is triggered by pushing to the `main` branch on GitHub — this is the CI/CD pipeline for v1
