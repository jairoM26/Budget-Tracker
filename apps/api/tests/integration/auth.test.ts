import { describe, it, expect } from "vitest";
import { request } from "../helpers";

const VALID_USER = {
  email: "jane@example.com",
  password: "password123",
  name: "Jane Doe",
};

describe("POST /auth/register", () => {
  it("returns 201 with user and access token on valid input", async () => {
    const res = await request.post("/auth/register").send(VALID_USER);

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
    const res = await request.post("/auth/register").send(VALID_USER);

    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("sets a refreshToken httpOnly cookie", async () => {
    const res = await request.post("/auth/register").send(VALID_USER);

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies).toBeDefined();
    const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken="));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("Path=/auth/refresh");
  });

  it("seeds default categories for the new user", async () => {
    const res = await request.post("/auth/register").send(VALID_USER);

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
    await request.post("/auth/register").send(VALID_USER);

    const res = await request.post("/auth/register").send(VALID_USER);

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

describe("POST /auth/login", () => {
  it("returns 200 with user and access token for valid credentials", async () => {
    await request.post("/auth/register").send(VALID_USER);

    const res = await request.post("/auth/login").send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      email: VALID_USER.email,
      name: VALID_USER.name,
      currency: "USD",
    });
    expect(res.body.data.accessToken).toBeDefined();
  });

  it("does not expose passwordHash in the response", async () => {
    await request.post("/auth/register").send(VALID_USER);

    const res = await request.post("/auth/login").send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("sets a refreshToken httpOnly cookie", async () => {
    await request.post("/auth/register").send(VALID_USER);

    const res = await request.post("/auth/login").send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies).toBeDefined();
    const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken="));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("Path=/auth/refresh");
  });

  it("returns 401 for unregistered email", async () => {
    const res = await request.post("/auth/login").send({
      email: "nobody@example.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Invalid credentials");
  });

  it("returns 401 for wrong password", async () => {
    await request.post("/auth/register").send(VALID_USER);

    const res = await request.post("/auth/login").send({
      email: VALID_USER.email,
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid credentials");
  });

  it("returns the same error for wrong email and wrong password (no user enumeration)", async () => {
    await request.post("/auth/register").send(VALID_USER);

    const wrongEmail = await request.post("/auth/login").send({
      email: "nobody@example.com",
      password: "password123",
    });
    const wrongPassword = await request.post("/auth/login").send({
      email: VALID_USER.email,
      password: "wrongpassword",
    });

    expect(wrongEmail.body.error.message).toBe(wrongPassword.body.error.message);
  });

  it("returns 400 with field errors on invalid input", async () => {
    const res = await request.post("/auth/login").send({
      email: "not-an-email",
      password: "",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields.email).toBeDefined();
    expect(res.body.error.fields.password).toBeDefined();
  });
});

describe("POST /auth/logout", () => {
  it("returns 200 and clears the refresh cookie", async () => {
    const registerRes = await request.post("/auth/register").send(VALID_USER);
    const cookies = registerRes.headers["set-cookie"] as unknown as string[];
    const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken="));

    const res = await request
      .post("/auth/logout")
      .set("Cookie", refreshCookie!);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const setCookieHeader = res.headers["set-cookie"] as unknown as string[];
    const clearedCookie = setCookieHeader?.find((c: string) => c.startsWith("refreshToken="));
    expect(clearedCookie).toContain("Expires=");
  });

  it("returns 200 even without a refresh cookie (idempotent)", async () => {
    const res = await request.post("/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("removes the refresh token from the database", async () => {
    const registerRes = await request.post("/auth/register").send(VALID_USER);
    const userId = registerRes.body.data.user.id;
    const cookies = registerRes.headers["set-cookie"] as unknown as string[];
    const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken="));

    await request.post("/auth/logout").set("Cookie", refreshCookie!);

    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const tokens = await prisma.refreshToken.findMany({ where: { userId } });
    await prisma.$disconnect();
    expect(tokens).toHaveLength(0);
  });
});
