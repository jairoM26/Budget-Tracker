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

export async function createTestCategory(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request
    .post("/categories")
    .set(authHeader(token))
    .send({ name: "Test Category", color: "#6366f1", icon: "tag", type: "EXPENSE", ...overrides })
    .expect(201);
  return res.body.data as { id: string; name: string; color: string; icon: string; type: string };
}

export async function createTestTransaction(token: string, categoryId: string, overrides: Record<string, unknown> = {}) {
  const res = await request
    .post("/transactions")
    .set(authHeader(token))
    .send({
      amount: "100.00",
      type: "EXPENSE",
      categoryId,
      description: "Test transaction",
      date: "2026-03-01",
      ...overrides,
    })
    .expect(201);
  return res.body.data as {
    id: string;
    amount: string;
    type: string;
    description: string;
    notes: string | null;
    date: string;
    category: { id: string; name: string; color: string; icon: string };
    recurringRuleId: string | null;
  };
}
