---
name: jwt-auth
description: Use this skill whenever implementing, modifying, or reviewing authentication and authorization code. Triggers on any mention of JWT, tokens, login, register, logout, refresh tokens, auth middleware, password hashing, bcrypt, session management, protected routes, or access control. Also use when discussing security patterns, token storage, or user identity extraction from requests.
---

# JWT Authentication — Budget Tracker

This skill defines the authentication architecture and security conventions for the Budget Tracker project.

## Architecture Overview

The project uses custom JWT authentication (no third-party auth service). This is a deliberate decision for learning purposes — understanding how JWT validation, token expiry, refresh rotation, and bcrypt cost factors work.

**Token flow:**
1. User registers or logs in → server returns an access token in the response body and sets a refresh token in an httpOnly cookie.
2. Client stores the access token in memory (a JavaScript variable) — never in localStorage or sessionStorage.
3. Every authenticated request includes `Authorization: Bearer <access_token>`.
4. When the access token expires (15 minutes), the client calls `POST /auth/refresh` which reads the refresh token from the cookie, validates it, rotates it, and returns a new access token.
5. Logout invalidates the refresh token and clears the cookie.

## Password Hashing

Use `bcryptjs` with a cost factor of 12. This takes approximately 250ms per hash — slow enough to resist brute force, fast enough for acceptable UX.

```typescript
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

## Token Generation

**Access token:** Short-lived (15 minutes), contains only the user ID as the `sub` claim. Signed with `JWT_SECRET`.

**Refresh token:** Longer-lived (7 days), stored in an httpOnly cookie. Signed with `REFRESH_TOKEN_SECRET` (a different secret from the access token).

```typescript
import jwt from "jsonwebtoken";

export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: "7d" }
  );
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { sub: string };
}
```

## Auth Middleware

The auth middleware runs on every protected route. It extracts the access token from the Authorization header, verifies it, and attaches the user ID to `req.user`.

```typescript
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user: { id: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Missing or invalid token" },
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
    });
  }
}
```

## Critical Security Rules

### User ID always comes from the token

The `userId` for any database operation is **always** extracted from the JWT (`req.user.id`). It is **never** taken from the request body, URL parameters, or query strings. This prevents users from impersonating other users.

```typescript
// CORRECT — userId from token
const categories = await categoryService.listByUser(req.user.id);

// WRONG — userId from request body (user could send any ID)
const categories = await categoryService.listByUser(req.body.userId);
```

### Refresh Token Cookie Configuration

Set the refresh token as an httpOnly, secure, sameSite cookie:

```typescript
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,        // JavaScript cannot access this cookie
  secure: process.env.NODE_ENV === "production",  // HTTPS only in production
  sameSite: "strict",    // Prevent CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: "/auth/refresh", // Only sent to the refresh endpoint
});
```

### Refresh Token Rotation

Every time a refresh token is used, it is invalidated and a new one is issued. This limits the damage if a refresh token is stolen — the attacker can use it only once before it becomes invalid.

### Never expose sensitive data

- Never include `passwordHash` in API responses.
- Never include stack traces in error responses.
- Never log tokens or passwords.
- Use `select` in Prisma queries to explicitly exclude sensitive fields.

## Registration Flow

1. Validate input with Zod (email, password min 8 chars, name).
2. Check if email already exists → 409 if duplicate.
3. Hash the password with bcrypt (cost 12).
4. Create the user in the database.
5. Seed default categories for the new user.
6. Generate access token + refresh token.
7. Set refresh token cookie.
8. Return user profile (without passwordHash) + access token.

## Login Flow

1. Validate input with Zod.
2. Find user by email → 401 "Invalid credentials" if not found (do not reveal whether the email exists).
3. Compare password with stored hash → 401 "Invalid credentials" if mismatch.
4. Generate access token + refresh token.
5. Set refresh token cookie.
6. Return user profile + access token.

## Frontend Token Storage

On the React client:
- Access token is stored in a React state variable (in-memory). It disappears on page refresh — this is intentional for security.
- On page load, the client calls `POST /auth/refresh` to silently obtain a new access token if a valid refresh cookie exists.
- An Axios/fetch interceptor automatically attaches the Bearer token to every request.
- On 401 response, the interceptor attempts a silent refresh. If the refresh also fails, redirect to login.

## Testing Auth

Integration tests for auth routes must cover:
- Successful registration and login (happy path)
- Duplicate email registration → 409
- Wrong password → 401
- Missing or invalid token on protected routes → 401
- Expired token → 401
- Resource belonging to another user → 403
- Refresh token rotation works correctly
- Logout invalidates the refresh token
