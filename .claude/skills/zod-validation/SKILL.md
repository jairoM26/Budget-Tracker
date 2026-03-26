---
name: zod-validation
description: Use this skill whenever defining, modifying, or reviewing request validation schemas. Triggers on any mention of Zod, validation, request body schemas, input sanitization, or when creating/updating API endpoints that accept user input. Also use when discussing shared validation between frontend and backend, or form validation patterns.
---

# Zod Validation — Budget Tracker

This skill defines conventions for all input validation using Zod in the Budget Tracker project.

## Why Zod

TypeScript catches type errors at compile time, but it cannot validate data at runtime. When data crosses a trust boundary — API requests, form submissions, external services — runtime validation is essential. Zod provides both: define a schema once, get runtime validation and static TypeScript types from the same source.

## Schema Location and Organization

All API request validation schemas live in `apps/api/src/validators/`. One file per resource domain.

```
src/validators/
├── auth.ts           # Register, login schemas
├── categories.ts     # Category CRUD schemas
├── transactions.ts   # Transaction CRUD + filter schemas
├── budgets.ts        # Budget CRUD schemas
├── recurring-rules.ts # Recurring rule schemas
└── common.ts         # Shared schemas (pagination, date range, uuid)
```

## Schema Conventions

### Use `z.infer` for TypeScript types

Define the schema once. Infer the type from it. Never duplicate a type definition manually alongside a schema.

```typescript
import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or fewer"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
  icon: z.string().min(1, "Icon is required").max(30),
  type: z.enum(["INCOME", "EXPENSE"]).nullable().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
```

### Monetary amounts are validated as strings

Since the API contract requires monetary amounts as strings (never floats), validate them as strings that match a decimal pattern.

```typescript
export const monetaryAmount = z
  .string()
  .regex(/^\d{1,10}\.\d{2}$/, "Must be a valid amount with exactly 2 decimal places (e.g., '1250.00')");
```

### Reusable base schemas

Define common patterns once in `validators/common.ts`:

```typescript
import { z } from "zod";

export const uuidParam = z.string().uuid("Must be a valid UUID");

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRange = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
});

export const yearMonth = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
```

### Partial schemas for PATCH endpoints

Use `.partial()` for update schemas where all fields are optional:

```typescript
export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
```

## Validation Middleware

A single reusable middleware validates request bodies (or query params) against a Zod schema. On failure, it returns a 400 response with field-level error messages in the standard envelope.

```typescript
import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fields = formatZodErrors(result.error);
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          fields,
        },
      });
    }

    // Replace req.body with the validated and coerced data
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const fields = formatZodErrors(result.error);
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          fields,
        },
      });
    }

    req.query = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fields[path]) {
      fields[path] = issue.message;
    }
  }
  return fields;
}
```

## Use `safeParse`, not `parse`

Always use `safeParse()` in middleware and service code. It returns a result object instead of throwing, which makes error handling explicit and predictable. Reserve `.parse()` only for cases where a thrown error is intentional (e.g., in test fixtures).

## Shared Validation (Future)

Zod schemas can be shared between frontend and backend via the `packages/shared` package. For v1, schemas live in the API only. When frontend form validation is needed, move shared schemas to `packages/shared/src/validators/` and import them from both `apps/api` and `apps/web`.

## Error Message Guidelines

Write error messages that are helpful to the end user, not technical jargon:

- "Name is required" not "String must have at least 1 character"
- "Must be a valid email address" not "Invalid string format"
- "Amount must have exactly 2 decimal places (e.g., '1250.00')" not "Regex mismatch"

## Testing Validators

Unit test each schema directly with representative valid and invalid inputs. These are fast tests that don't need HTTP or a database.

```typescript
import { describe, it, expect } from "vitest";
import { createCategorySchema } from "../validators/categories";

describe("createCategorySchema", () => {
  it("accepts valid input", () => {
    const result = createCategorySchema.safeParse({
      name: "Food",
      color: "#f97316",
      icon: "utensils",
      type: "EXPENSE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createCategorySchema.safeParse({
      color: "#f97316",
      icon: "utensils",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex color", () => {
    const result = createCategorySchema.safeParse({
      name: "Food",
      color: "not-a-color",
      icon: "utensils",
    });
    expect(result.success).toBe(false);
  });
});
```
