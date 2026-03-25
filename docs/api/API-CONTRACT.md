# API Contract — Budget Tracker

| Field        | Value                        |
|--------------|------------------------------|
| Version      | 1.0                          |
| Status       | Draft                        |
| Base URL     | `https://api.budget-app.com` |
| Last updated | 2026-03-24                   |

---

## Conventions

- All request and response bodies are JSON
- All timestamps are ISO 8601 strings: `2026-03-19T10:00:00.000Z`
- All monetary amounts are strings in decimal notation: `"1250.00"` — never floats
- Authentication is required on every endpoint except `POST /auth/register` and `POST /auth/login`
- Authenticated requests must include the header: `Authorization: Bearer <access_token>`
- The server returns a `user_id` claim from the token — the client never sends its own user ID in the request body
- Pagination uses `page` (1-indexed) and `limit` query parameters; responses include a `meta` object

## HTTP status codes used

| Code | Meaning                                      |
|------|----------------------------------------------|
| 200  | Success                                      |
| 201  | Resource created                             |
| 400  | Validation error — see `errors` in response  |
| 401  | Missing or invalid token                     |
| 403  | Token valid but resource belongs to another user |
| 404  | Resource not found                           |
| 409  | Conflict (e.g. duplicate budget for a month) |
| 500  | Internal server error                        |

## Standard error response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "fields": {
      "email": "Must be a valid email address"
    }
  }
}
```

---

## Authentication

### POST /auth/register

Create a new user account.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "minimum8chars",
  "name": "Jane Doe",
  "currency": "USD"
}
```

| Field      | Type   | Required | Description                              |
|------------|--------|----------|------------------------------------------|
| `email`    | string | Yes      | Valid email address                      |
| `password` | string | Yes      | Minimum 8 characters                     |
| `name`     | string | Yes      | 1–100 characters                         |
| `currency` | string | No       | `"USD"` or `"CRC"`, defaults to `"USD"` |

**Response 201**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "currency": "USD",
      "createdAt": "2026-03-19T10:00:00.000Z"
    },
    "accessToken": "eyJ..."
  }
}
```

**Errors:** 400 validation, 409 email already registered

---

### POST /auth/login

Authenticate an existing user.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "minimum8chars"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "name": "...", "currency": "USD" },
    "accessToken": "eyJ..."
  }
}
```

**Errors:** 400 validation, 401 invalid credentials

---

### POST /auth/refresh

Issue a new access token using the refresh token cookie.

**Request:** No body. Refresh token is read from `httpOnly` cookie.

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": { "id": "uuid", "email": "...", "name": "...", "currency": "USD", "createdAt": "..." }
  }
}
```

**Errors:** 401 missing or expired refresh token

---

### POST /auth/logout

Invalidate the refresh token.

**Response 200**
```json
{ "success": true }
```

---

## Users

### GET /users/me

Get the authenticated user's profile.

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "currency": "USD",
    "createdAt": "2026-03-19T10:00:00.000Z"
  }
}
```

---

### PATCH /users/me

Update the authenticated user's profile.

**Request body** (all fields optional)
```json
{
  "name": "Jane Smith",
  "currency": "CRC"
}
```

**Response 200** — returns updated user object

---

## Categories

### GET /categories

List all categories for the authenticated user.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Food",
      "color": "#f97316",
      "icon": "utensils",
      "type": "EXPENSE"
    }
  ]
}
```

---

### POST /categories

Create a new category.

**Request body**
```json
{
  "name": "Food",
  "color": "#f97316",
  "icon": "utensils",
  "type": "EXPENSE"
}
```

**Response 201** — returns created category

**Errors:** 400 validation

---

### PATCH /categories/:id

Update a category.

**Request body** (all fields optional)
```json
{
  "name": "Groceries",
  "color": "#84cc16"
}
```

**Response 200** — returns updated category

**Errors:** 404 not found, 403 not owner

---

### DELETE /categories/:id

Delete a category.

**Response 200**
```json
{ "success": true }
```

**Errors:** 404 not found, 403 not owner, 409 category has linked transactions

---

## Transactions

### GET /transactions

List transactions for the authenticated user.

**Query parameters**

| Parameter    | Type   | Required | Description                          |
|--------------|--------|----------|--------------------------------------|
| `page`       | int    | No       | Page number, default 1               |
| `limit`      | int    | No       | Items per page, default 20, max 100  |
| `from`       | date   | No       | Start date `YYYY-MM-DD`              |
| `to`         | date   | No       | End date `YYYY-MM-DD`                |
| `categoryId` | uuid   | No       | Filter by category                   |
| `type`       | string | No       | `INCOME` or `EXPENSE`                |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": "1250.00",
      "type": "INCOME",
      "description": "Monthly salary",
      "notes": null,
      "date": "2026-03-01T00:00:00.000Z",
      "category": { "id": "uuid", "name": "Salary", "color": "#22c55e", "icon": "briefcase" },
      "recurringRuleId": "uuid"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### POST /transactions

Create a transaction.

**Request body**
```json
{
  "amount": "85.50",
  "type": "EXPENSE",
  "categoryId": "uuid",
  "description": "Weekly groceries",
  "notes": "Farmer's market",
  "date": "2026-03-19"
}
```

**Response 201** — returns created transaction

**Errors:** 400 validation, 404 category not found, 403 category not owned by user

---

### PATCH /transactions/:id

Update a transaction.

**Request body** (all fields optional)
```json
{
  "amount": "90.00",
  "description": "Weekly groceries — corrected"
}
```

**Response 200** — returns updated transaction

---

### DELETE /transactions/:id

Delete a transaction.

**Response 200**
```json
{ "success": true }
```

---

## Budgets

### GET /budgets

List budgets for the authenticated user.

**Query parameters**

| Parameter | Type | Required | Description        |
|-----------|------|----------|--------------------|
| `year`    | int  | No       | Filter by year     |
| `month`   | int  | No       | Filter by month    |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "year": 2026,
      "month": 3,
      "totalLimit": "3000.00",
      "categories": [
        {
          "id": "uuid",
          "category": { "id": "uuid", "name": "Food", "color": "#f97316" },
          "limitAmount": "400.00",
          "spent": "185.50"
        }
      ]
    }
  ]
}
```

Note: `spent` is calculated at query time — it is not stored.

---

### POST /budgets

Create a budget for a given month.

**Request body**
```json
{
  "year": 2026,
  "month": 3,
  "totalLimit": "3000.00",
  "categories": [
    { "categoryId": "uuid", "limitAmount": "400.00" },
    { "categoryId": "uuid", "limitAmount": "200.00" }
  ]
}
```

**Response 201** — returns created budget with categories

**Errors:** 400 validation, 409 budget already exists for this month

---

### PATCH /budgets/:id

Update a budget and its category limits.

**Request body** (all fields optional)
```json
{
  "totalLimit": "3500.00",
  "categories": [
    { "categoryId": "uuid", "limitAmount": "500.00" }
  ]
}
```

**Response 200** — returns updated budget

---

### DELETE /budgets/:id

Delete a budget and all its category limits.

**Response 200**
```json
{ "success": true }
```

---

## Recurring Rules

### GET /recurring-rules

List all recurring rules for the authenticated user.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": "1200.00",
      "type": "EXPENSE",
      "description": "Monthly rent",
      "frequency": "MONTHLY",
      "nextDue": "2026-04-01T00:00:00.000Z",
      "endDate": null,
      "active": true,
      "category": { "id": "uuid", "name": "Housing", "color": "#8b5cf6" }
    }
  ]
}
```

---

### POST /recurring-rules

Create a recurring rule.

**Request body**
```json
{
  "amount": "1200.00",
  "type": "EXPENSE",
  "categoryId": "uuid",
  "description": "Monthly rent",
  "frequency": "MONTHLY",
  "startDate": "2026-04-01",
  "endDate": null
}
```

**Response 201** — returns created rule

---

### PATCH /recurring-rules/:id

Update a recurring rule.

**Request body** (all fields optional)
```json
{
  "amount": "1300.00",
  "active": false
}
```

**Response 200** — returns updated rule

---

### DELETE /recurring-rules/:id

Delete a recurring rule. Does not delete past generated transactions.

**Response 200**
```json
{ "success": true }
```

---

## Reports

### GET /reports/monthly-summary

Get income, expenses, and net balance for a given month.

**Query parameters**

| Parameter | Type | Required |
|-----------|------|----------|
| `year`    | int  | Yes      |
| `month`   | int  | Yes      |

**Response 200**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "month": 3,
    "totalIncome": "3500.00",
    "totalExpenses": "2185.50",
    "netBalance": "1314.50",
    "currency": "USD"
  }
}
```

---

### GET /reports/spending-by-category

Get spending per category for a month, with budget comparison.

**Query parameters:** `year`, `month` (both required)

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "category": { "id": "uuid", "name": "Food", "color": "#f97316" },
      "spent": "185.50",
      "budgetLimit": "400.00",
      "percentage": 46.4
    }
  ]
}
```

---

### GET /reports/monthly-trend

Get income and expense totals for the last N months.

**Query parameters**

| Parameter | Type | Required | Description              |
|-----------|------|----------|--------------------------|
| `months`  | int  | No       | Number of months, default 6, max 12 |

**Response 200**
```json
{
  "success": true,
  "data": [
    { "year": 2025, "month": 10, "totalIncome": "3200.00", "totalExpenses": "2800.00" },
    { "year": 2025, "month": 11, "totalIncome": "3500.00", "totalExpenses": "3100.00" }
  ]
}
```
