import { describe, it, expect, beforeEach } from "vitest";
import { request, createTestUser, createTestCategory, createTestTransaction, authHeader } from "../helpers";

describe("Transactions API", () => {
  let token: string;
  let categoryId: string;

  beforeEach(async () => {
    const { token: t } = await createTestUser();
    token = t;
    const cat = await createTestCategory(token);
    categoryId = cat.id;
  });

  // ──────────────────────────────────────────────
  // GET /transactions
  // ──────────────────────────────────────────────

  describe("GET /transactions", () => {
    it("returns empty list when user has no transactions", async () => {
      const res = await request.get("/transactions").set(authHeader(token)).expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });

    it("returns transactions with pagination meta", async () => {
      await createTestTransaction(token, categoryId);
      await createTestTransaction(token, categoryId, { description: "Second" });

      const res = await request.get("/transactions").set(authHeader(token)).expect(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it("returns transactions with serialized amount (string) and embedded category", async () => {
      await createTestTransaction(token, categoryId);
      const res = await request.get("/transactions").set(authHeader(token)).expect(200);
      const tx = res.body.data[0];
      expect(typeof tx.amount).toBe("string");
      expect(tx.category).toMatchObject({ id: categoryId });
    });

    it("paginates correctly", async () => {
      for (let i = 0; i < 3; i++) {
        await createTestTransaction(token, categoryId, { description: `Tx ${i}` });
      }
      const res = await request
        .get("/transactions?page=1&limit=2")
        .set(authHeader(token))
        .expect(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    });

    it("filters by type", async () => {
      await createTestTransaction(token, categoryId, { type: "INCOME", amount: "500.00" });
      await createTestTransaction(token, categoryId, { type: "EXPENSE" });

      const res = await request.get("/transactions?type=INCOME").set(authHeader(token)).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe("INCOME");
    });

    it("filters by categoryId", async () => {
      const cat2 = await createTestCategory(token, { name: "Other" });
      await createTestTransaction(token, categoryId);
      await createTestTransaction(token, cat2.id);

      const res = await request
        .get(`/transactions?categoryId=${categoryId}`)
        .set(authHeader(token))
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category.id).toBe(categoryId);
    });

    it("filters by date range", async () => {
      await createTestTransaction(token, categoryId, { date: "2026-01-15" });
      await createTestTransaction(token, categoryId, { date: "2026-03-10" });
      await createTestTransaction(token, categoryId, { date: "2026-05-20" });

      const res = await request
        .get("/transactions?from=2026-02-01&to=2026-04-30")
        .set(authHeader(token))
        .expect(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("does not return another user's transactions", async () => {
      const { token: otherToken } = await createTestUser();
      const otherCat = await createTestCategory(otherToken);
      await createTestTransaction(otherToken, otherCat.id);

      const res = await request.get("/transactions").set(authHeader(token)).expect(200);
      expect(res.body.meta.total).toBe(0);
    });

    it("returns 400 for invalid query params", async () => {
      const res = await request.get("/transactions?limit=999").set(authHeader(token)).expect(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 401 without token", async () => {
      await request.get("/transactions").expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // POST /transactions
  // ──────────────────────────────────────────────

  describe("POST /transactions", () => {
    it("creates a transaction with all fields", async () => {
      const res = await request
        .post("/transactions")
        .set(authHeader(token))
        .send({
          amount: "85.50",
          type: "EXPENSE",
          categoryId,
          description: "Weekly groceries",
          notes: "Farmer's market",
          date: "2026-03-19",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        amount: "85.50",
        type: "EXPENSE",
        description: "Weekly groceries",
        notes: "Farmer's market",
        category: { id: categoryId },
      });
    });

    it("returns 400 for missing required fields", async () => {
      const res = await request
        .post("/transactions")
        .set(authHeader(token))
        .send({ amount: "50.00" })
        .expect(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for invalid amount format", async () => {
      const res = await request
        .post("/transactions")
        .set(authHeader(token))
        .send({ amount: "50", type: "EXPENSE", categoryId, description: "Test", date: "2026-03-01" })
        .expect(400);
      expect(res.body.error.fields.amount).toBeDefined();
    });

    it("returns 404 when category does not exist", async () => {
      await request
        .post("/transactions")
        .set(authHeader(token))
        .send({
          amount: "50.00",
          type: "EXPENSE",
          categoryId: "00000000-0000-0000-0000-000000000000",
          description: "Test",
          date: "2026-03-01",
        })
        .expect(404);
    });

    it("returns 403 when category belongs to another user", async () => {
      const { token: otherToken } = await createTestUser();
      const otherCat = await createTestCategory(otherToken);

      await request
        .post("/transactions")
        .set(authHeader(token))
        .send({
          amount: "50.00",
          type: "EXPENSE",
          categoryId: otherCat.id,
          description: "Test",
          date: "2026-03-01",
        })
        .expect(403);
    });

    it("returns 401 without token", async () => {
      await request.post("/transactions").send({}).expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // PATCH /transactions/:id
  // ──────────────────────────────────────────────

  describe("PATCH /transactions/:id", () => {
    it("updates a transaction's fields", async () => {
      const tx = await createTestTransaction(token, categoryId);

      const res = await request
        .patch(`/transactions/${tx.id}`)
        .set(authHeader(token))
        .send({ description: "Updated description", amount: "200.00" })
        .expect(200);

      expect(res.body.data.description).toBe("Updated description");
      expect(res.body.data.amount).toBe("200.00");
    });

    it("can clear notes by setting to null", async () => {
      const tx = await createTestTransaction(token, categoryId, { notes: "Old note" });
      const res = await request
        .patch(`/transactions/${tx.id}`)
        .set(authHeader(token))
        .send({ notes: null })
        .expect(200);
      expect(res.body.data.notes).toBeNull();
    });

    it("returns 404 for non-existent transaction", async () => {
      await request
        .patch("/transactions/00000000-0000-0000-0000-000000000000")
        .set(authHeader(token))
        .send({ description: "X" })
        .expect(404);
    });

    it("returns 403 when updating another user's transaction", async () => {
      const { token: otherToken } = await createTestUser();
      const otherCat = await createTestCategory(otherToken);
      const otherTx = await createTestTransaction(otherToken, otherCat.id);

      await request
        .patch(`/transactions/${otherTx.id}`)
        .set(authHeader(token))
        .send({ description: "Hijacked" })
        .expect(403);
    });

    it("returns 403 when changing category to another user's category", async () => {
      const tx = await createTestTransaction(token, categoryId);
      const { token: otherToken } = await createTestUser();
      const otherCat = await createTestCategory(otherToken);

      await request
        .patch(`/transactions/${tx.id}`)
        .set(authHeader(token))
        .send({ categoryId: otherCat.id })
        .expect(403);
    });

    it("returns 401 without token", async () => {
      await request.patch("/transactions/some-id").send({}).expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /transactions/:id
  // ──────────────────────────────────────────────

  describe("DELETE /transactions/:id", () => {
    it("deletes a transaction", async () => {
      const tx = await createTestTransaction(token, categoryId);
      await request.delete(`/transactions/${tx.id}`).set(authHeader(token)).expect(200);

      const res = await request.get("/transactions").set(authHeader(token)).expect(200);
      expect(res.body.meta.total).toBe(0);
    });

    it("returns 404 for non-existent transaction", async () => {
      await request
        .delete("/transactions/00000000-0000-0000-0000-000000000000")
        .set(authHeader(token))
        .expect(404);
    });

    it("returns 403 when deleting another user's transaction", async () => {
      const { token: otherToken } = await createTestUser();
      const otherCat = await createTestCategory(otherToken);
      const otherTx = await createTestTransaction(otherToken, otherCat.id);

      await request.delete(`/transactions/${otherTx.id}`).set(authHeader(token)).expect(403);
    });

    it("returns 401 without token", async () => {
      await request.delete("/transactions/some-id").expect(401);
    });
  });
});
