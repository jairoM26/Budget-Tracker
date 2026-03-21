import { describe, it, expect, beforeEach } from "vitest";
import { request, createTestUser, createTestCategory, createTestTransaction, authHeader } from "../helpers";

describe("Budgets API", () => {
  let token: string;
  let categoryId: string;

  beforeEach(async () => {
    const { token: t } = await createTestUser();
    token = t;
    const cat = await createTestCategory(token);
    categoryId = cat.id;
  });

  // ──────────────────────────────────────────────
  // POST /budgets
  // ──────────────────────────────────────────────

  describe("POST /budgets", () => {
    it("creates a budget with no categories", async () => {
      const res = await request
        .post("/budgets")
        .set(authHeader(token))
        .send({ year: 2026, month: 3, totalLimit: "3000.00" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        year: 2026,
        month: 3,
        totalLimit: "3000.00",
        categories: [],
      });
    });

    it("creates a budget with category limits", async () => {
      const res = await request
        .post("/budgets")
        .set(authHeader(token))
        .send({
          year: 2026,
          month: 3,
          totalLimit: "3000.00",
          categories: [{ categoryId, limitAmount: "400.00" }],
        })
        .expect(201);

      expect(res.body.data.categories).toHaveLength(1);
      expect(res.body.data.categories[0]).toMatchObject({
        category: { id: categoryId },
        limitAmount: "400.00",
        spent: "0.00",
      });
    });

    it("returns 409 when budget for month already exists", async () => {
      await request
        .post("/budgets")
        .set(authHeader(token))
        .send({ year: 2026, month: 3, totalLimit: "2000.00" })
        .expect(201);

      const res = await request
        .post("/budgets")
        .set(authHeader(token))
        .send({ year: 2026, month: 3, totalLimit: "3000.00" })
        .expect(409);

      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("returns 400 for invalid month", async () => {
      const res = await request
        .post("/budgets")
        .set(authHeader(token))
        .send({ year: 2026, month: 13, totalLimit: "3000.00" })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for invalid totalLimit format", async () => {
      const res = await request
        .post("/budgets")
        .set(authHeader(token))
        .send({ year: 2026, month: 3, totalLimit: "3000" })
        .expect(400);

      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 401 without token", async () => {
      await request.post("/budgets").send({ year: 2026, month: 1, totalLimit: "1000.00" }).expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // GET /budgets
  // ──────────────────────────────────────────────

  describe("GET /budgets", () => {
    it("returns empty list when user has no budgets", async () => {
      const res = await request.get("/budgets").set(authHeader(token)).expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("returns budgets with category limits and calculated spent", async () => {
      // Create a budget with a category limit
      await request
        .post("/budgets")
        .set(authHeader(token))
        .send({
          year: 2026,
          month: 3,
          totalLimit: "1000.00",
          categories: [{ categoryId, limitAmount: "400.00" }],
        })
        .expect(201);

      // Create an EXPENSE transaction in March 2026 for that category
      await createTestTransaction(token, categoryId, {
        amount: "85.50",
        type: "EXPENSE",
        date: "2026-03-15",
      });

      const res = await request.get("/budgets").set(authHeader(token)).expect(200);
      expect(res.body.data).toHaveLength(1);

      const budget = res.body.data[0];
      expect(budget.totalLimit).toBe("1000.00");
      expect(budget.categories[0].spent).toBe("85.50");
      expect(budget.categories[0].limitAmount).toBe("400.00");
    });

    it("does not count INCOME transactions in spent", async () => {
      await request
        .post("/budgets")
        .set(authHeader(token))
        .send({
          year: 2026,
          month: 3,
          totalLimit: "1000.00",
          categories: [{ categoryId, limitAmount: "400.00" }],
        })
        .expect(201);

      // Add an INCOME transaction — should not count toward spent
      await createTestTransaction(token, categoryId, {
        amount: "500.00",
        type: "INCOME",
        date: "2026-03-10",
      });

      const res = await request.get("/budgets").set(authHeader(token)).expect(200);
      expect(res.body.data[0].categories[0].spent).toBe("0.00");
    });

    it("does not count transactions from other months", async () => {
      await request
        .post("/budgets")
        .set(authHeader(token))
        .send({
          year: 2026,
          month: 3,
          totalLimit: "1000.00",
          categories: [{ categoryId, limitAmount: "400.00" }],
        })
        .expect(201);

      // Transaction in February — should not count toward March budget
      await createTestTransaction(token, categoryId, {
        amount: "200.00",
        type: "EXPENSE",
        date: "2026-02-28",
      });

      const res = await request.get("/budgets").set(authHeader(token)).expect(200);
      expect(res.body.data[0].categories[0].spent).toBe("0.00");
    });

    it("filters by year and month", async () => {
      await request
        .post("/budgets")
        .set(authHeader(token))
        .send({ year: 2026, month: 3, totalLimit: "1000.00" })
        .expect(201);
      await request
        .post("/budgets")
        .set(authHeader(token))
        .send({ year: 2026, month: 4, totalLimit: "1200.00" })
        .expect(201);

      const res = await request
        .get("/budgets?year=2026&month=3")
        .set(authHeader(token))
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].month).toBe(3);
    });

    it("does not return another user's budgets", async () => {
      const { token: otherToken } = await createTestUser();
      await request
        .post("/budgets")
        .set(authHeader(otherToken))
        .send({ year: 2026, month: 3, totalLimit: "5000.00" })
        .expect(201);

      const res = await request.get("/budgets").set(authHeader(token)).expect(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("returns 401 without token", async () => {
      await request.get("/budgets").expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // PATCH /budgets/:id
  // ──────────────────────────────────────────────

  describe("PATCH /budgets/:id", () => {
    it("updates totalLimit", async () => {
      const created = await request
        .post("/budgets")
        .set(authHeader(token))
        .send({ year: 2026, month: 3, totalLimit: "2000.00" })
        .expect(201);

      const id = created.body.data.id;
      const res = await request
        .patch(`/budgets/${id}`)
        .set(authHeader(token))
        .send({ totalLimit: "2500.00" })
        .expect(200);

      expect(res.body.data.totalLimit).toBe("2500.00");
    });

    it("upserts category limits", async () => {
      const created = await request
        .post("/budgets")
        .set(authHeader(token))
        .send({
          year: 2026,
          month: 3,
          totalLimit: "2000.00",
          categories: [{ categoryId, limitAmount: "300.00" }],
        })
        .expect(201);

      const id = created.body.data.id;
      const res = await request
        .patch(`/budgets/${id}`)
        .set(authHeader(token))
        .send({ categories: [{ categoryId, limitAmount: "500.00" }] })
        .expect(200);

      const cat = res.body.data.categories.find(
        (c: { category: { id: string } }) => c.category.id === categoryId
      );
      expect(cat.limitAmount).toBe("500.00");
    });

    it("returns 404 for non-existent budget", async () => {
      await request
        .patch("/budgets/00000000-0000-0000-0000-000000000000")
        .set(authHeader(token))
        .send({ totalLimit: "1000.00" })
        .expect(404);
    });

    it("returns 403 when updating another user's budget", async () => {
      const { token: otherToken } = await createTestUser();
      const created = await request
        .post("/budgets")
        .set(authHeader(otherToken))
        .send({ year: 2026, month: 3, totalLimit: "2000.00" })
        .expect(201);

      await request
        .patch(`/budgets/${created.body.data.id}`)
        .set(authHeader(token))
        .send({ totalLimit: "9999.00" })
        .expect(403);
    });

    it("returns 401 without token", async () => {
      await request.patch("/budgets/some-id").send({}).expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /budgets/:id
  // ──────────────────────────────────────────────

  describe("DELETE /budgets/:id", () => {
    it("deletes a budget", async () => {
      const created = await request
        .post("/budgets")
        .set(authHeader(token))
        .send({ year: 2026, month: 3, totalLimit: "1000.00" })
        .expect(201);

      const id = created.body.data.id;
      await request.delete(`/budgets/${id}`).set(authHeader(token)).expect(200);

      const res = await request.get("/budgets").set(authHeader(token)).expect(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("returns 404 for non-existent budget", async () => {
      await request
        .delete("/budgets/00000000-0000-0000-0000-000000000000")
        .set(authHeader(token))
        .expect(404);
    });

    it("returns 403 when deleting another user's budget", async () => {
      const { token: otherToken } = await createTestUser();
      const created = await request
        .post("/budgets")
        .set(authHeader(otherToken))
        .send({ year: 2026, month: 3, totalLimit: "2000.00" })
        .expect(201);

      await request
        .delete(`/budgets/${created.body.data.id}`)
        .set(authHeader(token))
        .expect(403);
    });

    it("returns 401 without token", async () => {
      await request.delete("/budgets/some-id").expect(401);
    });
  });
});
