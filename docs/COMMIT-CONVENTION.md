# Commit Convention — Budget Tracker

## Format

```
[category] type(scope): short description
```

## Categories

| Category | When to use |
|----------|-------------|
| `[usr]` | Changes that affect the user-facing product — features, bug fixes, UI, endpoints |
| `[dev]` | Changes that affect developers only — tooling, config, docs, tests, infra, migrations |

## Types

| Type | When to use |
|------|-------------|
| `feat` | Something new that didn't exist before |
| `chg` | Modification to something that already exists |
| `fix` | Bug fix |
| `refactor` | Code restructure with no behavior change |
| `chore` | Tooling, dependencies, config |
| `docs` | Documentation only |
| `test` | Adding or updating tests |

## Scopes

Match the project structure:

| Scope | Area |
|-------|------|
| `api` | Express backend |
| `web` | React frontend |
| `shared` | Shared types and utilities |
| `infra` | Tooling, CI/CD, Docker, ESLint, Vitest config |
| `db` | Prisma schema and migrations |

## Rules

- Subject line max 72 characters
- Lowercase, no period at the end
- Imperative mood: "add" not "added", "implement" not "implements"
- Body is optional — use it only when the *why* isn't obvious from the subject

## Examples

```
[usr] feat(api): implement POST /auth/register
[usr] chg(api): update register response to include currency field
[usr] fix(web): correct token refresh redirect loop
[usr] refactor(api): extract password hashing to auth service

[dev] chore(infra): add dotenv and configure ESLint
[dev] chg(infra): update ESLint to ignore underscore-prefixed args
[dev] docs(infra): add infrastructure verification guide
[dev] test(api): add integration tests for auth routes
[dev] db: add initial Prisma schema with all models
```
