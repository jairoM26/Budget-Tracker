# Environment Setup — Budget Tracker

| Field        | Value              |
|--------------|--------------------|
| Version      | 2.0                |
| Last updated | 2026-03-20         |

Follow this document from top to bottom on any new machine. Every step includes a verification command. Do not skip verifications — they are the acceptance criteria for DS-00.

PostgreSQL runs inside a Docker container. You do not install PostgreSQL on your machine. Node.js runs natively on your machine for full hot-reload performance.

---

## 1. Required tools

| Tool           | Required version  | Purpose                                    |
|----------------|-------------------|--------------------------------------------|
| Node.js        | 20 LTS or higher  | Runs the API and build tools natively      |
| npm            | 9 or higher       | Package manager (bundled with Node)        |
| Git            | Any recent        | Version control                            |
| Docker Desktop | 4.x or higher     | Runs the PostgreSQL container              |

---

## 2. Install Node.js 20 LTS

Download from [nodejs.org](https://nodejs.org) — choose the **LTS** version. Use the Windows installer.

Verify in PowerShell or Command Prompt:
```powershell
node --version   # must print v20.x.x or higher
npm --version    # must print 9.x.x or higher
```

---

## 3. Install Git

Download from [git-scm.com](https://git-scm.com). During installation, choose:
- **"Use Git from the command line and also from 3rd-party software"**
- **"Checkout as-is, commit as-is"** — line endings are managed by `.gitattributes`, not by Git globally

Verify:
```powershell
git --version
```

Configure your identity:
```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## 4. Install Docker Desktop

Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/).

During installation, ensure **WSL 2 backend** is selected — this is the default on Windows 10/11 and gives significantly better performance than the Hyper-V backend.

After installation, start Docker Desktop and wait until the whale icon in the system tray is steady (not animated).

Verify:
```powershell
docker --version          # must print Docker version 24.x or higher
docker compose version    # must print Docker Compose version v2.x
```

> If `docker compose` is not found, try `docker-compose` (with a hyphen). The v2 syntax without a hyphen is preferred.

---

## 5. Clone the repository

```powershell
git clone https://github.com/<your-username>/budget-app.git
cd budget-app
```

Verify `.gitattributes` is present at the root:
```powershell
Get-Content .gitattributes | Select-Object -First 5
# must print the line endings configuration header
```

---

## 6. Start the PostgreSQL container

From the repository root:
```powershell
docker compose up -d
```

This starts a PostgreSQL 16 container named `budget_postgres`. On the first run it downloads the image (~80 MB) and runs `docker/init.sql`, which creates both the `budget_dev` and `budget_test` databases automatically.

Verify the container is healthy:
```powershell
docker compose ps
# STATUS column must show: healthy
```

Verify both databases exist:
```powershell
docker exec budget_postgres psql -U budget -c "\l"
# must list budget_dev and budget_test
```

---

## 7. Install Node dependencies

From the repository root:
```powershell
npm install
```

Verify — no errors should appear. A `node_modules/` folder at the root confirms success.

---

## 8. Configure environment variables

Copy the example files:
```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env
```

The default values in `.env.example` already match the Docker Compose configuration, so no edits are required for a standard local setup. For reference, `apps/api/.env` should contain:

```env
DATABASE_URL=postgresql://budget:budget_local@localhost:5432/budget_dev
TEST_DATABASE_URL=postgresql://budget:budget_local@localhost:5432/budget_test
JWT_SECRET=change-this-to-a-long-random-string-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=change-this-to-another-long-random-string
NODE_ENV=development
```

And `apps/web/.env`:
```env
VITE_API_URL=http://localhost:3000
```

> Never commit either `.env` file. They are in `.gitignore`.

---

## 9. Run database migrations

```powershell
cd apps\api
npx prisma migrate dev
cd ..\..
```

Verify the tables were created:
```powershell
docker exec budget_postgres psql -U budget -d budget_dev -c "\dt"
# must list: users, categories, budgets, budget_categories,
#            transactions, recurring_rules
```

---

## 10. Start the development servers

Open two PowerShell windows from the repository root.

**Window 1 — API server:**
```powershell
npm run dev:api
# must print: Server running on port 3000
```

Verify:
```powershell
curl http://localhost:3000/health
# must return: {"status":"ok"}
```

**Window 2 — Web server:**
```powershell
npm run dev:web
# must print: Local: http://localhost:5173/
```

Open [http://localhost:5173](http://localhost:5173) in a browser. The React app must load without console errors.

---

## 11. Verify the test suite

```powershell
npm run test --workspace=apps/api
```

All tests should pass. The test suite connects to `budget_test` using `TEST_DATABASE_URL`.

---

## Daily workflow

```powershell
# Start the database (if not already running)
docker compose up -d

# Start development servers (two separate windows)
npm run dev:api
npm run dev:web

# Stop the database when done for the day
docker compose stop
```

The `postgres_data` Docker volume persists your data between restarts. To completely reset the database:
```powershell
docker compose down -v   # WARNING: destroys all local data
docker compose up -d
npx prisma migrate dev --prefix apps/api
```

---

## Troubleshooting

**`docker compose up -d` fails with "port 5432 already in use"**

Another process is using port 5432 — likely a local PostgreSQL installation.
Stop the local service:
```powershell
Stop-Service postgresql-x64-16   # adjust version number as needed
```
Or change the host port in `docker-compose.yml` from `"5432:5432"` to `"5433:5432"` and update `DATABASE_URL` accordingly.

**`docker compose ps` shows STATUS as "starting" for more than 30 seconds**

The container is unhealthy. Check logs:
```powershell
docker compose logs postgres
```

**`npm run dev:api` fails with "Cannot find module '@budget-app/shared'"**

Build the shared package first:
```powershell
npm run build --workspace=packages/shared
```

**Hot reload is very slow or not triggering**

Ensure your project is cloned inside the WSL 2 file system rather than the Windows file system. The path should start with `\\wsl$\` or you should be working inside a WSL terminal. Windows NTFS paths (`C:\Users\...`) have much slower file watching in Node.

**Line ending errors in scripts or YAML files**

This should not occur if `.gitattributes` was present before the first clone. If you cloned before `.gitattributes` existed, re-normalise all files:
```powershell
git add --renormalize .
git commit -m "normalize line endings"
```
