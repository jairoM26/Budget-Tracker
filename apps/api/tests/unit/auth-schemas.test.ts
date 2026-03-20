import { describe, it, expect } from "vitest";
import { registerSchema } from "../../src/validators/auth";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      name: "Jane Doe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = registerSchema.safeParse({
      password: "password123",
      name: "Jane Doe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "password123",
      name: "Jane Doe",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Must be a valid email address");
    }
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "short",
      name: "Jane Doe",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password must be at least 8 characters");
    }
  });

  it("accepts password of exactly 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "12345678",
      name: "Jane Doe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Name is required");
    }
  });

  it("rejects name longer than 100 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});
