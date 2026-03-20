# Product Requirements Document — Budget Tracker

| Field        | Value                          |
|--------------|--------------------------------|
| Version      | 1.0                            |
| Status       | Draft — pending review         |
| Author       | Engineering Team               |
| Last updated | 2026-03-19                     |

---

## 1. Purpose

This document defines the requirements for **Budget Tracker**, a multi-tenant web application that allows individual users to record income and expenses, set monthly budget limits per spending category, and visualize their financial health over time.

The goal is not to replace a banking application. It is to give users a simple, private, and structured way to understand where their money goes each month.

---

## 2. Problem Statement

Most people lack a clear picture of their monthly spending. Existing solutions are either too complex (full personal finance platforms), too simple (spreadsheets with no structure), or require linking bank credentials (a privacy and security concern for many users). There is a gap for a lightweight, self-managed budget tracker that users control entirely.

---

## 3. Target Users

### Primary user — the self-tracking individual

- Age range: 20–45
- Tracks personal or household expenses manually or semi-automatically
- Wants monthly budget limits per category (e.g. "I want to spend max $300 on food")
- Comfortable using a web browser on desktop and mobile
- Does not want to link their bank account

### Secondary user — the family budget manager

- Manages shared household expenses
- Needs to track income from multiple sources
- Reviews monthly summaries at the end of each period

---

## 4. Goals and Non-Goals

### Goals (v1 — MVP)

- Allow users to register and manage their own independent account (multi-tenant)
- Record income and expense transactions with category, amount, date, and description
- Define monthly budget limits per category
- Create recurring transaction rules (e.g. rent every 1st of the month)
- View monthly reports with charts: spending per category, budget vs actual, income vs expenses
- Support any currency via a user-level currency preference

### Non-goals (explicitly out of scope for v1)

- Bank account linking or direct bank API integration
- Shared accounts or multi-user collaboration on the same budget
- Investment tracking, net worth, or asset management
- Native mobile application (web responsive is sufficient for v1)
- Offline mode
- Data export (CSV, PDF) — considered for v2
- Email parsing / AI transaction ingestion — considered for v2 (agentic phase)

---

## 5. Features

### 5.1 Authentication

- User registration with email and password
- Secure login returning a JWT access token
- Password hashed with bcrypt (minimum cost factor 12)
- Token stored in memory on the client (not localStorage) to mitigate XSS
- Logout clears the token

### 5.2 Category management

- User can create, edit, and delete custom categories
- Each category has a name, color, icon, and an optional type hint (income / expense)
- Default categories are seeded on first login (Food, Transport, Housing, Health, Entertainment, Salary)
- A category cannot be deleted if transactions are linked to it

### 5.3 Transaction management

- Record a transaction with: amount, type (INCOME / EXPENSE), category, date, description, optional notes
- Edit or delete any transaction
- List transactions with filters: date range, category, type
- Paginated results (20 per page)

### 5.4 Budget management

- Create a monthly budget with an overall spending limit
- Assign a specific limit to one or more categories within that budget
- A user can have exactly one budget per calendar month
- Carry-forward is not supported in v1 (each month is independent)

### 5.5 Recurring transactions

- Define a rule: amount, type, category, description, frequency (daily / weekly / monthly / yearly), start date, optional end date
- A background scheduler runs daily and creates transactions for any rules that are due
- Generated transactions are linked to their originating rule
- Rules can be paused or deleted; deleting a rule does not delete past generated transactions

### 5.6 Reports and charts

- Monthly summary: total income, total expenses, net balance
- Spending by category: bar or donut chart comparing actual vs budget limit
- Monthly trend: line chart showing income and expenses across the last 6 months
- All charts are scoped to the authenticated user

---

## 6. User Stories

| ID    | As a…  | I want to…                                              | So that…                                         |
|-------|--------|---------------------------------------------------------|--------------------------------------------------|
| US-01 | user   | register with email and password                        | I have my own private account                    |
| US-02 | user   | log in and stay authenticated                           | I do not have to log in on every visit           |
| US-03 | user   | create and manage spending categories                   | I can organise transactions my own way           |
| US-04 | user   | record an expense or income transaction                 | I have a log of my financial activity            |
| US-05 | user   | set a monthly budget with limits per category           | I know when I am approaching my spending limits  |
| US-06 | user   | define a recurring transaction                          | Predictable income and expenses are tracked automatically |
| US-07 | user   | see a monthly summary with charts                       | I can understand my financial health at a glance |
| US-08 | user   | filter my transaction history by date and category      | I can find specific entries quickly              |
| US-09 | user   | set my preferred currency                               | Amounts display in the currency I use            |

---

## 7. Constraints and Assumptions

- The application is deployed on free cloud tiers (Vercel for frontend, Render for backend and database). Cold starts and resource limits apply.
- The database is PostgreSQL. All tenant data is isolated by `user_id` on every table and every query.
- The application is English-only in v1.
- The system clock of the server is the authoritative source for dates. User timezone support is a v2 consideration.
- Decimal precision for all monetary amounts: 12 digits total, 2 decimal places.

---

## 8. Success Metrics

| Metric                              | Target         |
|-------------------------------------|----------------|
| User can register and log first transaction | Under 3 minutes |
| Monthly report loads                | Under 2 seconds on free tier |
| Budget vs actual calculation is accurate | 100% — financial data has zero tolerance for rounding errors |
| All API routes reject unauthenticated requests | 100% coverage verified by tests |

---

## 9. Open Questions

| ID  | Question                                                        | Owner       | Status  |
|-----|-----------------------------------------------------------------|-------------|---------|
| OQ-01 | Should users be able to set a budget that carries forward unspent amounts? | Product | Open |
| OQ-02 | What happens to transactions if a category is deleted? Block or reassign? | Engineering | Open |
| OQ-03 | Should the scheduler run on the server or as a separate worker process? | Architecture | Open |

---

## 10. Revision History

| Version | Date       | Author           | Change              |
|---------|------------|------------------|---------------------|
| 1.0     | 2026-03-19 | Engineering Team | Initial draft       |
