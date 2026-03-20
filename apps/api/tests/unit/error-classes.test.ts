import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../src/utils/errors";

describe("AppError", () => {
  it("sets statusCode, code, and message", () => {
    const err = new AppError(422, "UNPROCESSABLE", "bad input");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("UNPROCESSABLE");
    expect(err.message).toBe("bad input");
    expect(err.name).toBe("AppError");
  });

  it("sets optional fields when provided", () => {
    const err = new AppError(400, "VALIDATION_ERROR", "invalid", { email: "required" });
    expect(err.fields).toEqual({ email: "required" });
  });

  it("leaves fields undefined when not provided", () => {
    const err = new AppError(500, "INTERNAL", "oops");
    expect(err.fields).toBeUndefined();
  });

  it("is an instance of Error", () => {
    const err = new AppError(500, "INTERNAL", "oops");
    expect(err instanceof Error).toBe(true);
  });
});

describe("NotFoundError", () => {
  it("defaults to 404 NOT_FOUND", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
  });

  it("accepts a custom message", () => {
    const err = new NotFoundError("User not found");
    expect(err.message).toBe("User not found");
  });
});

describe("UnauthorizedError", () => {
  it("defaults to 401 UNAUTHORIZED", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("accepts a custom message", () => {
    const err = new UnauthorizedError("Invalid token");
    expect(err.message).toBe("Invalid token");
  });
});

describe("ForbiddenError", () => {
  it("defaults to 403 FORBIDDEN", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });
});

describe("ConflictError", () => {
  it("sets 409 CONFLICT with provided message", () => {
    const err = new ConflictError("Email already registered");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
    expect(err.message).toBe("Email already registered");
  });
});

describe("ValidationError", () => {
  it("sets 400 VALIDATION_ERROR with field map", () => {
    const fields = { email: "Must be a valid email", password: "Too short" };
    const err = new ValidationError(fields);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.fields).toEqual(fields);
  });
});
