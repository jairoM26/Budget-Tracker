import supertest from "supertest";
import app from "../src/app";

export const request = supertest(app);

export async function createTestUser(overrides: Record<string, string> = {}) {
  const userData = {
    email: `test-${Date.now()}@example.com`,
    password: "password123",
    name: "Test User",
    ...overrides,
  };

  const res = await request.post("/auth/register").send(userData).expect(201);

  return {
    user: res.body.data.user,
    token: res.body.data.accessToken,
    credentials: userData,
  };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
