# Budget Tracker

A multi-tenant web application for tracking income, expenses, and monthly budgets. Users manage their own categories, transactions, and recurring rules. All data is private and isolated per account.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express.js + TypeScript + Prisma ORM |
| Database | PostgreSQL |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | Custom JWT with refresh token rotation |
| Validation | Zod |
| Testing | Vitest + Supertest + Playwright |

## Project Structure

```
budget-app-final/
├── apps/
│   ├── api/          # Express REST API (port 3000)
│   └── web/          # React frontend (port 5173)
├── packages/
│   └── shared/       # Shared TypeScript types and enums
└── docs/             # Architecture, API contract, task board
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop

### Setup

```bash
# Install dependencies
npm install

# Start the database
docker compose up -d

# Create your local environment file
copy apps\api\.env.example apps\api\.env

# Run the database migration
cd apps/api && npx prisma migrate dev && cd ../..
```

### Development

```bash
npm run dev:api     # API on http://localhost:3000
npm run dev:web     # Frontend on http://localhost:5173
```

### Quality Checks

```bash
npm run typecheck   # TypeScript across all packages
npm run lint        # ESLint across all packages
npm run test        # Vitest unit + integration tests
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PRD.md](docs/PRD.md) | Product requirements |
| [docs/api/API-CONTRACT.md](docs/api/API-CONTRACT.md) | Full API specification |
| [docs/TASK-BOARD.md](docs/TASK-BOARD.md) | Milestones and task tracking |
| [docs/COMMIT-CONVENTION.md](docs/COMMIT-CONVENTION.md) | Commit message rules |
| [docs/INFRA-VERIFICATION.md](docs/INFRA-VERIFICATION.md) | Steps to verify the local setup works |
| [docs/TEST-PLAN.md](docs/TEST-PLAN.md) | Testing strategy |
| [docs/adr/ADRs.md](docs/adr/ADRs.md) | Architecture decision records |
