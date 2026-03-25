import { describe, it, expect, beforeEach } from "vitest";
import { request, createTestUser, createTestCategory, authHeader } from "../helpers";

describe("Recurring Rules API", () => {
  let token: string;
  let categoryId: string;

  beforeEach(async () => {
    const { token: t } = await createTestUser();
    token = t;
    const cat = await createTestCategory(token);
    categoryId = cat.id;
  });

  const validRule = () => ({
    amount: "1200.00",
    type: "EXPENSE",
    categoryId,
    description: "Monthly rent",
    frequency: "MONTHLY",
    startDate: "2026-04-01",
  });

  // ──────────────────────────────────────────────
  // POST /recurring-rules
  // ──────────────────────────────────────────────

  describe("POST /recurring-rules", () => {
    it("creates a recurring rule", async () => {
      const res = await request
        .post("/recurring-rules")
        .set(authHeader(token))
        .send(validRule())
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        amount: "1200.00",
        type: "EXPENSE",
        description: "Monthly rent",
        frequency: "MONTHLY",
        active: true,
        endDate: null,
        category: { id: categoryId },
      });
      expect(res.body.data.nextDue).toContain("2026-04-01");
    });

    it("creates a rule with endDate", async () => {
      const res = await request
        .post("/recurring-rules")
        .set(authHeader(token))
        .send({ ...validRule(), endDate: "2027-03-01" })
        .expect(201);

      expect(res.body.data.endDate).toContain("2027-03-01");
    });

    it("returns 400 on invalid input", async () => {
      await request
        .post("/recurring-rules")
        .set(authHeader(token))
        .send({ amount: "bad" })
        .expect(400);
    });

    it("returns 404 for non-existent category", async () => {
      await request
        .post("/recurring-rules")
        .set(authHeader(token))
        .send({ ...validRule(), categoryId: "00000000-0000-0000-0000-000000000000" })
        .expect(404);
    });

    it("returns 401 without token", async () => {
      await request
        .post("/recurring-rules")
        .send(validRule())
        .expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // GET /recurring-rules
  // ──────────────────────────────────────────────

  describe("GET /recurring-rules", () => {
    it("returns empty list initially", async () => {
      const res = await request
        .get("/recurring-rules")
        .set(authHeader(token))
        .expect(200);

      expect(res.body.data).toEqual([]);
    });

    it("returns created rules", async () => {
      await request.post("/recurring-rules").set(authHeader(token)).send(validRule()).expect(201);
      await request.post("/recurring-rules").set(authHeader(token)).send({
        ...validRule(),
        description: "Weekly groceries",
        frequency: "WEEKLY",
      }).expect(201);

      const res = await request
        .get("/recurring-rules")
        .set(authHeader(token))
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });

    it("does not return other user's rules", async () => {
      await request.post("/recurring-rules").set(authHeader(token)).send(validRule()).expect(201);

      const { token: token2 } = await createTestUser({ email: "other@test.com" });
      const res = await request
        .get("/recurring-rules")
        .set(authHeader(token2))
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────
  // PATCH /recurring-rules/:id
  // ──────────────────────────────────────────────

  describe("PATCH /recurring-rules/:id", () => {
    it("updates amount", async () => {
      const created = await request.post("/recurring-rules").set(authHeader(token)).send(validRule()).expect(201);

      const res = await request
        .patch(`/recurring-rules/${created.body.data.id}`)
        .set(authHeader(token))
        .send({ amount: "1300.00" })
        .expect(200);

      expect(res.body.data.amount).toBe("1300.00");
    });

    it("deactivates a rule", async () => {
      const created = await request.post("/recurring-rules").set(authHeader(token)).send(validRule()).expect(201);

      const res = await request
        .patch(`/recurring-rules/${created.body.data.id}`)
        .set(authHeader(token))
        .send({ active: false })
        .expect(200);

      expect(res.body.data.active).toBe(false);
    });

    it("returns 404 for non-existent rule", async () => {
      await request
        .patch("/recurring-rules/00000000-0000-0000-0000-000000000000")
        .set(authHeader(token))
        .send({ amount: "1300.00" })
        .expect(404);
    });

    it("returns 403 for another user's rule", async () => {
      const created = await request.post("/recurring-rules").set(authHeader(token)).send(validRule()).expect(201);

      const { token: token2 } = await createTestUser({ email: "other2@test.com" });
      await request
        .patch(`/recurring-rules/${created.body.data.id}`)
        .set(authHeader(token2))
        .send({ amount: "1300.00" })
        .expect(403);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /recurring-rules/:id
  // ──────────────────────────────────────────────

  describe("DELETE /recurring-rules/:id", () => {
    it("deletes a rule", async () => {
      const created = await request.post("/recurring-rules").set(authHeader(token)).send(validRule()).expect(201);

      await request
        .delete(`/recurring-rules/${created.body.data.id}`)
        .set(authHeader(token))
        .expect(200);

      const list = await request.get("/recurring-rules").set(authHeader(token)).expect(200);
      expect(list.body.data).toHaveLength(0);
    });

    it("returns 404 for non-existent rule", async () => {
      await request
        .delete("/recurring-rules/00000000-0000-0000-0000-000000000000")
        .set(authHeader(token))
        .expect(404);
    });

    it("returns 403 for another user's rule", async () => {
      const created = await request.post("/recurring-rules").set(authHeader(token)).send(validRule()).expect(201);

      const { token: token2 } = await createTestUser({ email: "other3@test.com" });
      await request
        .delete(`/recurring-rules/${created.body.data.id}`)
        .set(authHeader(token2))
        .expect(403);
    });
  });

  // ──────────────────────────────────────────────
  // POST /recurring-rules/process (scheduler)
  // ──────────────────────────────────────────────

  describe("POST /recurring-rules/process", () => {
    it("generates transactions for due rules", async () => {
      // Create a rule with startDate in the past
      await request.post("/recurring-rules").set(authHeader(token)).send({
        ...validRule(),
        startDate: "2026-03-01",
      }).expect(201);

      // Trigger the scheduler
      const res = await request
        .post("/recurring-rules/process")
        .set(authHeader(token))
        .expect(200);

      expect(res.body.data.generated).toBeGreaterThanOrEqual(1);

      // Verify transaction was created
      const txRes = await request
        .get("/transactions")
        .set(authHeader(token))
        .expect(200);

      const generated = txRes.body.data.filter((tx: { description: string }) => tx.description === "Monthly rent");
      expect(generated.length).toBeGreaterThanOrEqual(1);
      expect(generated[0].recurringRuleId).toBeTruthy();
    });

    it("does not generate transactions for inactive rules", async () => {
      const created = await request.post("/recurring-rules").set(authHeader(token)).send({
        ...validRule(),
        startDate: "2026-03-01",
      }).expect(201);

      // Deactivate
      await request
        .patch(`/recurring-rules/${created.body.data.id}`)
        .set(authHeader(token))
        .send({ active: false })
        .expect(200);

      const res = await request
        .post("/recurring-rules/process")
        .set(authHeader(token))
        .expect(200);

      expect(res.body.data.generated).toBe(0);
    });

    it("does not generate transactions for future rules", async () => {
      await request.post("/recurring-rules").set(authHeader(token)).send({
        ...validRule(),
        startDate: "2099-01-01",
      }).expect(201);

      const res = await request
        .post("/recurring-rules/process")
        .set(authHeader(token))
        .expect(200);

      expect(res.body.data.generated).toBe(0);
    });

    it("advances nextDue after processing", async () => {
      await request.post("/recurring-rules").set(authHeader(token)).send({
        ...validRule(),
        startDate: "2026-03-01",
        frequency: "MONTHLY",
      }).expect(201);

      await request.post("/recurring-rules/process").set(authHeader(token)).expect(200);

      const rules = await request.get("/recurring-rules").set(authHeader(token)).expect(200);
      const rule = rules.body.data[0];
      // nextDue should have advanced past the original startDate
      expect(new Date(rule.nextDue).getTime()).toBeGreaterThan(new Date("2026-03-01").getTime());
    });
  });
});
