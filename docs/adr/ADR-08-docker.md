# ADR-08 — Docker Compose for local infrastructure

| Field   | Value              |
|---------|--------------------|
| Date    | 2026-03-20         |
| Status  | Accepted           |

## Decision

Use Docker Compose to run PostgreSQL locally during development and testing. Node.js processes (API and web) run natively on the host machine. PostgreSQL is never installed directly on any developer's machine.

## Context

The project is developed on Windows and will be contributed to by future developers on potentially different operating systems. PostgreSQL version mismatches, configuration differences, and manual database setup are a recurring source of "works on my machine" bugs. A consistent, versioned infrastructure definition eliminates this entire category of problem.

## Alternatives considered

**Docker Compose for everything (API + web + PostgreSQL)** — maximum reproducibility. Rejected because file system watching between a Windows host and a Linux container introduces significant hot-reload latency with Vite and ts-node-dev, which would slow down the daily development loop. The reproducibility benefit does not outweigh the cost at this stage.

**Dev container (VS Code)** — the entire development environment runs inside a container, including the editor's extensions. Rejected because it requires VS Code specifically, is heavier to set up, and adds complexity that is not justified for a solo developer at this stage. Worth revisiting if the team grows.

**Local PostgreSQL installation** — simplest for a single developer. Rejected because it creates an implicit dependency on the developer's local PostgreSQL version and configuration. When a second developer joins, setup friction and version drift are likely.

## Windows-specific consideration

Windows uses `\r\n` line endings by default. Shell scripts and configuration files committed with Windows line endings will fail when executed inside Linux containers or on Linux CI runners. A `.gitattributes` file is committed to the repository root to enforce `LF` line endings for all shell scripts, YAML files, and configuration files. This is configured once and applies to all developers regardless of their operating system.

## Consequences

- Any developer can start the full local environment with two commands: `docker compose up -d` and `npm install`
- PostgreSQL version is pinned in `docker-compose.yml` and versioned in git — all developers run the same version
- The CI pipeline uses the same `postgres:16` image, so local and CI database behaviour is identical
- Developers must have Docker Desktop installed — this is the only infrastructure prerequisite
- Node.js 20 LTS must still be installed on the host — this is the only language prerequisite
- The `docker-compose.yml` file defines both a `budget_dev` database and a `budget_test` database so no manual database creation is needed
