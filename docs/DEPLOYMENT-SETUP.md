# Deployment Setup Guide — Budget Tracker

Run these steps once to wire up the full CI/CD pipeline.
After completing this guide, every PR will run CI automatically and every merge to `main` will deploy to staging.

---

## Overview

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Staging | Vercel (auto) | Render (staging service) | Render PostgreSQL (staging) |
| Production | Vercel (auto) | Render (production service) | Render PostgreSQL (production) |

---

## Step 1 — Render (Backend + Database)

### 1a. Create two PostgreSQL databases

1. Log in to [render.com](https://render.com)
2. New → PostgreSQL → name it `budget-tracker-staging-db`
3. Note the **Internal Database URL** — you'll need it for the staging API service
4. Repeat for `budget-tracker-production-db`

### 1b. Create two Web Services (API)

For each environment (staging, production):

1. New → Web Service → connect your GitHub repo
2. Settings:
   - **Name:** `budget-tracker-api-staging` / `budget-tracker-api-production`
   - **Branch:** `main`
   - **Root directory:** *(leave empty — repo root)*
   - **Build command:** `npm install && npm run build --workspace=packages/shared && npm run build --workspace=apps/api`
   - **Start command:** `node apps/api/dist/index.js`
   - **Instance type:** Free (staging) / Starter (production)
3. Environment variables — add all of these:
   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Internal Database URL from Step 1a |
   | `JWT_SECRET` | Generate with: `openssl rand -hex 32` |
   | `JWT_EXPIRES_IN` | `15m` |
   | `REFRESH_TOKEN_SECRET` | Generate with: `openssl rand -hex 32` |
   | `NODE_ENV` | `production` |
4. **Disable auto-deploy** — we control deploys via GitHub Actions
5. Go to Settings → Deploy Hook → copy the URL

### 1c. Save deploy hook URLs

You will add these to GitHub Secrets in Step 3:
- Staging deploy hook URL → `RENDER_STAGING_DEPLOY_HOOK`
- Production deploy hook URL → `RENDER_PRODUCTION_DEPLOY_HOOK`

---

## Step 2 — Vercel (Frontend)

Vercel handles frontend deploys automatically once connected. No workflow file needed.

1. Log in to [vercel.com](https://vercel.com)
2. New Project → Import Git Repository → select `Budget-Tracker`
3. Settings:
   - **Framework preset:** Vite
   - **Root directory:** `apps/web`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Environment variables:
   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | Your Render staging API URL (e.g. `https://budget-tracker-api-staging.onrender.com`) |
5. Deploy

After this:
- Every push to `main` → Vercel auto-deploys to production
- Every PR → Vercel creates a preview deployment

Note the **staging URL** (your Vercel production URL) — you'll need it for Step 3.

---

## Step 3 — GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

Add each of these:

| Secret name | Value |
|-------------|-------|
| `RENDER_STAGING_DEPLOY_HOOK` | Deploy hook URL from Step 1c (staging) |
| `RENDER_PRODUCTION_DEPLOY_HOOK` | Deploy hook URL from Step 1c (production) |
| `PREVIEW_URL` | Your Vercel staging URL (used by E2E workflow) |

---

## Step 4 — Branch Protection on `main`

Go to your GitHub repo → Settings → Branches → Add branch protection rule.

- **Branch name pattern:** `main`
- Enable: **Require a pull request before merging**
  - Enable: Require approvals → 0 (solo project, skip approval requirement)
- Enable: **Require status checks to pass before merging**
  - Search for and add: `quality` (this is the CI job name in `ci.yml`)
- Enable: **Require branches to be up to date before merging**
- Enable: **Do not allow bypassing the above settings**

---

## Step 5 — Verify the pipeline

1. Create a test branch, push a commit, open a PR
2. Confirm the `CI` workflow runs and passes
3. Merge the PR
4. Confirm the `Deploy to Staging` workflow runs and Render redeploys
5. Confirm Vercel shows a new production deployment
6. Go to GitHub → Actions → `Deploy to Production` → Run workflow → type `deploy`
7. Confirm Render production service redeploys

---

## Pipeline summary (after setup)

```
PR opened
  └── CI runs (typecheck → lint → test)
  └── Vercel creates preview deployment

PR merged to main
  └── Deploy to Staging runs (Render staging redeploys)
  └── Vercel redeploys production frontend
  └── E2E tests run against staging

Production deploy (manual)
  └── Actions → Deploy to Production → Run workflow → type "deploy"
  └── Render production API redeploys
```
