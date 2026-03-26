---
name: express-api
description: Use this skill whenever building, modifying, or reviewing Express.js API routes, controllers, middleware, or server configuration in this project. Triggers include creating new endpoints, adding middleware, structuring route files, handling errors, or any backend Express work. Also use when discussing API architecture decisions, request/response patterns, or async error handling.
---

# Express API Architecture — Budget Tracker

This skill defines the patterns and conventions for all Express.js backend code in the Budget Tracker project.

## Three-Layer Architecture

Separate concerns into three distinct layers. Never put business logic directly in route handlers.

1. **Routes** (`src/routes/`) — Define HTTP endpoints and wire up middleware + controllers. Routes only declare the path, HTTP method, validation middleware, and controller function. No business logic here.

2. **Controllers** (`src/controllers/`) — Handle the HTTP request/response cycle. Extract validated data from the request, call service functions, and format the response. Controllers know about `req` and `res` but do not query the database directly.

3. **Services** (`src/services/`) — Contain all business logic and database interactions via Prisma. Services receive plain data (not `req`/`res`), perform operations, and return results. This makes them testable without HTTP context.

```
src/
├── routes/          # Route definitions only
│   ├── auth.ts
│   ├── categories.ts
│   ├── transactions.ts
│   ├── budgets.ts
│   ├── recurring-rules.ts
│   └── reports.ts
├── controllers/     # Request/response handling
├── services/        # Business logic + Prisma queries
├── middleware/       # Auth, validation, error handling, logging
├── utils/           # Pure helper functions
├── validators/      # Zod schemas for request validation
├── prisma.ts        # Singleton Prisma client instance
└── index.ts         # App bootstrap and server start
```

## Route Pattern

Every route file follows this exact pattern:

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createCategorySchema } from "../validators/categories";
import * as categoryController from "../controllers/categories";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get("/", categoryController.list);
router.post("/", validate(createCategorySchema), categoryController.create);
router.patch("/:id", validate(updateCategorySchema), categoryController.update);
router.delete("/:id", categoryController.remove);

export default router;
```

## Controller Pattern

Controllers are thin. They extract data, call services, and send responses.

```typescript
import { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/categories";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.listByUser(req.user.id);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}
```

## Standard Response Envelope

Every response follows the API contract envelope:

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Success with pagination:**
```json
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 } }
```

**Error:**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Human-readable description", "fields": { "email": "Must be a valid email address" } } }
```

## Error Handling

Use a centralized error handler. Never let unhandled errors crash the server.

**Custom error classes:**
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(403, "FORBIDDEN", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}
```

**Global error handler middleware (must be the last middleware registered):**
```typescript
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields && { fields: err.fields }),
      },
    });
  }

  // Unknown errors — log but never expose stack to client
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
```

**Async error forwarding:** Every async controller function wraps its body in try/catch and calls `next(error)` on failure. Alternatively, use a wrapper utility:

```typescript
import { Request, Response, NextFunction } from "express";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
```

## Middleware Registration Order

Register middleware in this exact order in the app bootstrap:

1. `cors()` — Cross-origin requests
2. `express.json()` — Body parsing
3. `cookieParser()` — Cookie parsing (for refresh tokens)
4. Request logging middleware (if enabled)
5. Route handlers
6. 404 catch-all handler
7. Global error handler (must be last)

## Multi-Tenant Isolation

This is the most critical security rule: **every database query must be scoped to the authenticated user's ID.**

- The `userId` always comes from the JWT token (via `req.user.id`), never from the request body or URL parameters.
- Every Prisma `findMany`, `findUnique`, `update`, and `delete` includes `userId` in its `where` clause.
- For resource access, always verify ownership before performing the operation. Return 403 if the resource belongs to another user.

## Monetary Values

- All monetary amounts are stored as `Decimal(12,2)` in PostgreSQL via Prisma.
- All monetary values in API requests and responses are **strings** (e.g., `"1250.00"`), never floating-point numbers.
- Prisma returns `Decimal` objects. Convert them to strings with `.toString()` before including in responses.

## Environment Variables

Required variables are validated at server startup. If any are missing, the server exits with a clear error message rather than starting in a broken state. See `.env.example` for the complete list.
