---
name: prisma-data-layer
description: Use this skill whenever working with the database layer — writing Prisma queries, modifying the schema, creating migrations, writing seed scripts, or optimizing database access. Also use when discussing data modeling, relationships, indexes, or any Prisma Client usage patterns. Triggers on any mention of Prisma, database, migration, schema, or data access code.
---

# Prisma Data Layer — Budget Tracker

This skill defines conventions for all database interactions using Prisma ORM in the Budget Tracker project.

## Schema as Source of Truth

The file `apps/api/prisma/schema.prisma` is the single authoritative definition of the data model. All models, enums, relationships, and constraints are defined there. The generated Prisma Client provides fully type-safe queries — passing a wrong field type is a compile-time error.

## Prisma Client Singleton

Create a single Prisma Client instance and reuse it across the application. Never instantiate `new PrismaClient()` in individual files.

```typescript
// src/prisma.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
```

Import this singleton in services:
```typescript
import prisma from "../prisma";
```

## Query Patterns

### Always scope by userId

Every query that accesses tenant data must include the authenticated user's ID. This is the most critical data isolation rule.

```typescript
// Correct — scoped to user
const categories = await prisma.category.findMany({
  where: { userId },
});

// WRONG — returns all users' data
const categories = await prisma.category.findMany();
```

### Select only needed fields

When returning data to the API, select only the fields needed for the response. This reduces data transfer and avoids leaking sensitive fields like `passwordHash`.

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    name: true,
    currency: true,
    createdAt: true,
    // passwordHash is deliberately excluded
  },
});
```

### Ownership verification pattern

For update and delete operations, first find the resource scoped to the user. If it doesn't exist, determine whether it's a 404 (doesn't exist at all) or 403 (exists but belongs to another user).

```typescript
async function findOwnedCategory(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  if (category.userId !== userId) {
    throw new ForbiddenError("Access denied");
  }

  return category;
}
```

### Pagination

Use Prisma's `skip` and `take` for pagination. Calculate metadata for the response.

```typescript
async function listTransactions(
  userId: string,
  page: number,
  limit: number,
  filters: TransactionFilters
) {
  const where = { userId, ...buildFilterWhere(filters) };

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: "desc" },
      include: { category: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Decimal handling

Prisma returns `Decimal` objects for `Decimal` columns. Always convert to strings before sending in API responses.

```typescript
// Convert a single record
function serializeTransaction(tx: Transaction) {
  return {
    ...tx,
    amount: tx.amount.toString(),
  };
}

// For budget categories with computed "spent"
function serializeBudgetCategory(bc: BudgetCategory & { spent: Decimal }) {
  return {
    ...bc,
    limitAmount: bc.limitAmount.toString(),
    spent: bc.spent.toString(),
  };
}
```

### Relational includes

Use `include` to fetch related data in a single query rather than making multiple round trips.

```typescript
const transaction = await prisma.transaction.findUnique({
  where: { id: transactionId },
  include: {
    category: {
      select: { id: true, name: true, color: true, icon: true },
    },
  },
});
```

## Migrations

- Run `npx prisma migrate dev --name descriptive_name` to create migrations during development.
- Migration SQL files are committed alongside the schema change that produced them.
- Never edit migration files after they've been applied — create a new migration instead.
- Run `npx prisma generate` after schema changes to regenerate the client.

## Seed Script

A seed script (`prisma/seed.ts`) provides default categories for development and manual testing. It is never used in automated tests — tests create their own data.

```typescript
// prisma/seed.ts
import { PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  { name: "Food", color: "#f97316", icon: "utensils", type: TransactionType.EXPENSE },
  { name: "Transport", color: "#3b82f6", icon: "car", type: TransactionType.EXPENSE },
  { name: "Housing", color: "#8b5cf6", icon: "home", type: TransactionType.EXPENSE },
  { name: "Health", color: "#ef4444", icon: "heart", type: TransactionType.EXPENSE },
  { name: "Entertainment", color: "#ec4899", icon: "film", type: TransactionType.EXPENSE },
  { name: "Salary", color: "#22c55e", icon: "briefcase", type: TransactionType.INCOME },
];
```

## Constraints and Safety

- **Foreign keys:** All relationships enforce referential integrity at the database level. A transaction cannot reference a non-existent category.
- **Unique constraints:** `[userId, year, month]` on Budget prevents duplicate monthly budgets. `[budgetId, categoryId]` on BudgetCategory prevents duplicate category limits.
- **Cascade deletes:** Deleting a User cascades to all their Categories, Transactions, Budgets, and RecurringRules. Deleting a Category is blocked if transactions are linked (enforced in application code — return 409 with count of linked transactions).
- **Decimal precision:** All monetary columns use `Decimal(12, 2)` — 12 total digits, 2 decimal places. No floating-point arithmetic anywhere.

## Testing Database

Integration tests use a separate database (`budget_test`) configured via `TEST_DATABASE_URL`. Tests clean up after themselves using `deleteMany` in reverse dependency order. The test database is never shared with development.
