# Infrastructure Verification — Budget Tracker

Run these steps in order to confirm the Milestone 0 scaffold is working correctly.
Each step has an expected outcome. Stop and fix any step that does not match before continuing.

---

## Prerequisites

- Node.js 20+ installed
- Docker Desktop running
- Repository cloned and you are in the root directory (`budget-app-final/`)

---

## Steps

### 1. Install dependencies

```powershell
npm install
```

**Expected:** No errors. `node_modules/` appears at the root and inside each workspace.

---

### 2. Start the database

```powershell
docker compose up -d
```

**Expected:** Output includes `budget_postgres` container starting or already running. Verify with:

```powershell
docker ps
```

You should see a container named `budget_postgres` with status `Up`.

---

### 3. Create the local environment file

```powershell
copy apps\api\.env.example apps\api\.env
```

**Expected:** `apps/api/.env` now exists. No changes needed — the defaults work for local development.

---

### 4. Run the database migration

```powershell
cd apps\api
npx prisma migrate dev --name init
cd ..\..
```

**Expected:** Output ends with `Your database is now in sync with your schema.` All tables are created in the `budget_dev` database.

---

### 5. TypeScript check

```powershell
npm run typecheck
```

**Expected:** No output, exit code 0. All three workspaces (`api`, `web`, `shared`) compile without errors.

---

### 6. Lint check

```powershell
npm run lint
```

**Expected:** Only `no-console` warnings in `apps/api/src/index.ts`. No errors. Exit code 0.

---

### 7. Tests

```powershell
npm run test
```

**Expected:** Output includes `No test files found` and exits with code 0 (`passWithNoTests` is enabled). No failures.

---

### 8. API health check

In one terminal, start the API:

```powershell
npm run dev:api
```

**Expected:** You see:

```
Server running on port 3000
```

In a second terminal, call the health endpoint:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

**Expected:**

```
status
------
ok
```

---

### 9. Frontend dev server

```powershell
npm run dev:web
```

**Expected:** Output includes:

```
VITE ready in ... ms
➜  Local: http://localhost:5173/
```

Open `http://localhost:5173` in a browser. A blank React page loads without console errors.

---

## All steps passed?

Milestone 0 — Foundation is confirmed working. The project is ready for Milestone 1 — Authentication.

## Known non-issues

| Symptom | Explanation |
|---------|-------------|
| `WARNING: TypeScript version 5.9.3 not officially supported` | `@typescript-eslint` is conservative about version support. Everything works fine. |
| Three `no-console` warnings in lint output | Expected. The skeleton `index.ts` uses `console.log/error` temporarily. These will be replaced by a proper logger in Milestone 7. |
