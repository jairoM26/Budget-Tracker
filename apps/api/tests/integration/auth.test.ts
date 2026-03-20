import { describe, it, expect } from "vitest";
import { request } from "../helpers";

describe("POST /auth/register", () => {
  it("returns 201 with user and access token on valid input", async () => {
    const res = await request.post("/auth/register").send({
      email: "jane@example.com",
      password: "password123",
      name: "Jane Doe",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      email: "jane@example.com",
      name: "Jane Doe",
      currency: "USD",
    });
    expect(res.body.data.user.id).toBeDefined();
    expect(res.body.data.user.createdAt).toBeDefined();
    expect(res.body.data.accessToken).toBeDefined();
  });

  it("does not expose passwordHash in the response", async () => {
    const res = await request.post("/auth/register").send({
      email: "jane@example.com",
      password: "password123",
      name: "Jane Doe",
    });

    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("sets a refreshToken httpOnly cookie", async () => {
    const res = await request.post("/auth/register").send({
      email: "jane@example.com",
      password: "password123",
      name: "Jane Doe",
    });

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies).toBeDefined();
    const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken="));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("Path=/auth/refresh");
  });

  it("seeds default categories for the new user", async () => {
    const res = await request.post("/auth/register").send({
      email: "jane@example.com",
      password: "password123",
      name: "Jane Doe",
    });

    expect(res.status).toBe(201);
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const categories = await prisma.category.findMany({
      where: { userId: res.body.data.user.id },
    });
    await prisma.$disconnect();
    expect(categories.length).toBeGreaterThan(0);
  });

  it("returns 409 when email is already registered", async () => {
    await request.post("/auth/register").send({
      email: "jane@example.com",
      password: "password123",
      name: "Jane Doe",
    });

    const res = await request.post("/auth/register").send({
      email: "jane@example.com",
      password: "password123",
      name: "Jane Doe",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CONFLICT");
    expect(res.body.error.message).toBe("Email already registered");
  });

  it("returns 400 with field errors on invalid input", async () => {
    const res = await request.post("/auth/register").send({
      email: "not-an-email",
      password: "short",
      name: "",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.email).toBeDefined();
    expect(res.body.error.fields.password).toBeDefined();
    expect(res.body.error.fields.name).toBeDefined();
  });

  it("returns 400 when body is empty", async () => {
    const res = await request.post("/auth/register").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
