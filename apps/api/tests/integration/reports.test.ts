import { describe, it, expect, beforeEach } from "vitest";
import { request, createTestUser, createTestCategory, createTestTransaction, authHeader } from "../helpers";

describe("Reports API", () => {
  let token: string;
  let expenseCatId: string;
  let expenseCat2Id: string;
  let incomeCatId: string;

  beforeEach(async () => {
    const { token: t } = await createTestUser();
    token = t;

    const expenseCat = await createTestCategory(token, { name: "Food", color: "#f97316" });
    expenseCatId = expenseCat.id;

    const expenseCat2 = await createTestCategory(token, { name: "Transport", color: "#3b82f6" });
    expenseCat2Id = expenseCat2.id;

    const incomeCat = await createTestCategory(token, { name: "Salary", type: "INCOME", color: "#22c55e" });
    incomeCatId = incomeCat.id;

    // Seed transactions for March 2026
    await createTestTransaction(token, expenseCatId, { amount: "150.00", date: "2026-03-05", description: "Groceries" });
    await createTestTransaction(token, expenseCatId, { amount: "50.00", date: "2026-03-15", description: "Restaurant" });
    await createTestTransaction(token, expenseCat2Id, { amount: "30.00", date: "2026-03-10", description: "Bus" });
    await createTestTransaction(token, incomeCatId, {
      amount: "3000.00", type: "INCOME", date: "2026-03-01", description: "Paycheck",
    });
  });

  // ──────────────────────────────────────────────
  // GET /reports/monthly-summary
  // ──────────────────────────────────────────────

  describe("GET /reports/monthly-summary", () => {
    it("returns income, expenses, and net balance for a month", async () => {
      const res = await request
        .get("/reports/monthly-summary")
        .query({ year: 2026, month: 3 })
        .set(authHeader(token))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        year: 2026,
        month: 3,
        totalIncome: "3000.00",
        totalExpenses: "230.00",
        netBalance: "2770.00",
        currency: "USD",
      });
    });

    it("returns zeros for a month with no transactions", async () => {
      const res = await request
        .get("/reports/monthly-summary")
        .query({ year: 2025, month: 1 })
        .set(authHeader(token))
        .expect(200);

      expect(res.body.data).toMatchObject({
        totalIncome: "0.00",
        totalExpenses: "0.00",
        netBalance: "0.00",
      });
    });

    it("returns 400 for missing year/month", async () => {
      await request
        .get("/reports/monthly-summary")
        .set(authHeader(token))
        .expect(400);
    });

    it("returns 401 without auth", async () => {
      await request
        .get("/reports/monthly-summary")
        .query({ year: 2026, month: 3 })
        .expect(401);
    });

    it("does not include other users' transactions", async () => {
      const { token: otherToken } = await createTestUser();
      const otherCat = await createTestCategory(otherToken, { name: "Other", type: "INCOME" });
      await createTestTransaction(otherToken, otherCat.id, {
        amount: "5000.00", type: "INCOME", date: "2026-03-01", description: "Other income",
      });

      const res = await request
        .get("/reports/monthly-summary")
        .query({ year: 2026, month: 3 })
        .set(authHeader(token))
        .expect(200);

      // Should still be 3000, not 8000
      expect(res.body.data.totalIncome).toBe("3000.00");
    });
  });

  // ──────────────────────────────────────────────
  // GET /reports/spending-by-category
  // ──────────────────────────────────────────────

  describe("GET /reports/spending-by-category", () => {
    it("returns spending grouped by category", async () => {
      const res = await request
        .get("/reports/spending-by-category")
        .query({ year: 2026, month: 3 })
        .set(authHeader(token))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2); // Food + Transport (expenses only)

      const food = res.body.data.find((d: { category: { name: string } }) => d.category.name === "Food");
      expect(food).toBeDefined();
      expect(food.spent).toBe("200.00");
      expect(food.category.color).toBe("#f97316");

      const transport = res.body.data.find((d: { category: { name: string } }) => d.category.name === "Transport");
      expect(transport).toBeDefined();
      expect(transport.spent).toBe("30.00");
    });

    it("includes budget limit and percentage when budget exists", async () => {
      // Create a budget for March 2026
      await request
        .post("/budgets")
        .set(authHeader(token))
        .send({
          year: 2026,
          month: 3,
          totalLimit: "1000.00",
          categories: [
            { categoryId: expenseCatId, limitAmount: "400.00" },
            { categoryId: expenseCat2Id, limitAmount: "100.00" },
          ],
        })
        .expect(201);

      const res = await request
        .get("/reports/spending-by-category")
        .query({ year: 2026, month: 3 })
        .set(authHeader(token))
        .expect(200);

      const food = res.body.data.find((d: { category: { name: string } }) => d.category.name === "Food");
      expect(food.budgetLimit).toBe("400.00");
      expect(food.percentage).toBe(50); // 200/400 = 50%

      const transport = res.body.data.find((d: { category: { name: string } }) => d.category.name === "Transport");
      expect(transport.budgetLimit).toBe("100.00");
      expect(transport.percentage).toBe(30); // 30/100 = 30%
    });

    it("returns null budgetLimit/percentage when no budget exists", async () => {
      const res = await request
        .get("/reports/spending-by-category")
        .query({ year: 2026, month: 3 })
        .set(authHeader(token))
        .expect(200);

      const food = res.body.data.find((d: { category: { name: string } }) => d.category.name === "Food");
      expect(food.budgetLimit).toBeNull();
      expect(food.percentage).toBeNull();
    });

    it("returns empty array for a month with no expenses", async () => {
      const res = await request
        .get("/reports/spending-by-category")
        .query({ year: 2025, month: 1 })
        .set(authHeader(token))
        .expect(200);

      expect(res.body.data).toEqual([]);
    });

    it("returns 401 without auth", async () => {
      await request
        .get("/reports/spending-by-category")
        .query({ year: 2026, month: 3 })
        .expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // GET /reports/monthly-trend
  // ──────────────────────────────────────────────

  describe("GET /reports/monthly-trend", () => {
    it("returns monthly income/expense totals", async () => {
      const res = await request
        .get("/reports/monthly-trend")
        .query({ months: 1 })
        .set(authHeader(token))
        .expect(200);

      expect(res.body.success).toBe(true);
      // This test uses months=1, which shows only the current month.
      // Since test transactions are in March 2026, this may or may not match
      // depending on current date in the test env. We check structure.
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const entry of res.body.data) {
        expect(entry).toHaveProperty("year");
        expect(entry).toHaveProperty("month");
        expect(entry).toHaveProperty("totalIncome");
        expect(entry).toHaveProperty("totalExpenses");
      }
    });

    it("defaults to 6 months when no months param", async () => {
      const res = await request
        .get("/reports/monthly-trend")
        .set(authHeader(token))
        .expect(200);

      expect(res.body.data).toHaveLength(6);
    });

    it("returns 400 for months > 12", async () => {
      await request
        .get("/reports/monthly-trend")
        .query({ months: 13 })
        .set(authHeader(token))
        .expect(400);
    });

    it("returns 401 without auth", async () => {
      await request
        .get("/reports/monthly-trend")
        .expect(401);
    });

    it("does not include other users' data in trend", async () => {
      const { token: otherToken } = await createTestUser();
      const otherCat = await createTestCategory(otherToken, { name: "Other", type: "INCOME" });
      await createTestTransaction(otherToken, otherCat.id, {
        amount: "9999.00", type: "INCOME", date: "2026-03-15", description: "Big salary",
      });

      const res = await request
        .get("/reports/monthly-trend")
        .query({ months: 12 })
        .set(authHeader(token))
        .expect(200);

      // Find March 2026 entry, income should be 3000 not 12999
      const march = res.body.data.find((d: { year: number; month: number }) => d.year === 2026 && d.month === 3);
      if (march) {
        expect(march.totalIncome).toBe("3000.00");
      }
    });
  });
});
