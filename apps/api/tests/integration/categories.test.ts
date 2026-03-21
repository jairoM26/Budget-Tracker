import { describe, it, expect, beforeEach } from "vitest";
import { request, createTestUser, authHeader } from "../helpers";

describe("Categories API", () => {
  let token: string;

  beforeEach(async () => {
    const { token: t } = await createTestUser();
    token = t;
  });

  // ──────────────────────────────────────────────
  // GET /categories
  // ──────────────────────────────────────────────

  describe("GET /categories", () => {
    it("returns default categories seeded on registration", async () => {
      const res = await request.get("/categories").set(authHeader(token)).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        color: expect.any(String),
        icon: expect.any(String),
      });
    });

    it("returns 401 without token", async () => {
      await request.get("/categories").expect(401);
    });

    it("does not return categories belonging to another user", async () => {
      const { token: otherToken } = await createTestUser();

      // Create a unique category for the other user
      await request
        .post("/categories")
        .set(authHeader(otherToken))
        .send({ name: "OtherUserCategory" })
        .expect(201);

      const res = await request.get("/categories").set(authHeader(token)).expect(200);
      const names = res.body.data.map((c: { name: string }) => c.name);
      expect(names).not.toContain("OtherUserCategory");
    });
  });

  // ──────────────────────────────────────────────
  // POST /categories
  // ──────────────────────────────────────────────

  describe("POST /categories", () => {
    it("creates a category with all fields", async () => {
      const res = await request
        .post("/categories")
        .set(authHeader(token))
        .send({ name: "Travel", color: "#3b82f6", icon: "plane", type: "EXPENSE" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: expect.any(String),
        name: "Travel",
        color: "#3b82f6",
        icon: "plane",
        type: "EXPENSE",
      });
    });

    it("creates a category with defaults for optional fields", async () => {
      const res = await request
        .post("/categories")
        .set(authHeader(token))
        .send({ name: "Misc" })
        .expect(201);

      expect(res.body.data.name).toBe("Misc");
      expect(res.body.data.color).toBe("#6366f1");
      expect(res.body.data.icon).toBe("tag");
      expect(res.body.data.type).toBeNull();
    });

    it("returns 400 when name is missing", async () => {
      const res = await request
        .post("/categories")
        .set(authHeader(token))
        .send({ color: "#3b82f6" })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when color is not a valid hex", async () => {
      const res = await request
        .post("/categories")
        .set(authHeader(token))
        .send({ name: "Bad Color", color: "red" })
        .expect(400);

      expect(res.body.error.fields.color).toBeDefined();
    });

    it("returns 401 without token", async () => {
      await request.post("/categories").send({ name: "Test" }).expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // PATCH /categories/:id
  // ──────────────────────────────────────────────

  describe("PATCH /categories/:id", () => {
    it("updates an existing category", async () => {
      const createRes = await request
        .post("/categories")
        .set(authHeader(token))
        .send({ name: "OldName" })
        .expect(201);

      const id = createRes.body.data.id;

      const updateRes = await request
        .patch(`/categories/${id}`)
        .set(authHeader(token))
        .send({ name: "NewName", color: "#84cc16" })
        .expect(200);

      expect(updateRes.body.data.name).toBe("NewName");
      expect(updateRes.body.data.color).toBe("#84cc16");
    });

    it("returns 404 for a non-existent category", async () => {
      await request
        .patch("/categories/00000000-0000-0000-0000-000000000000")
        .set(authHeader(token))
        .send({ name: "X" })
        .expect(404);
    });

    it("returns 403 when updating another user's category", async () => {
      const { token: otherToken } = await createTestUser();
      const createRes = await request
        .post("/categories")
        .set(authHeader(otherToken))
        .send({ name: "OtherCat" })
        .expect(201);

      await request
        .patch(`/categories/${createRes.body.data.id}`)
        .set(authHeader(token))
        .send({ name: "Hijacked" })
        .expect(403);
    });

    it("returns 401 without token", async () => {
      await request.patch("/categories/some-id").send({ name: "X" }).expect(401);
    });
  });

  // ──────────────────────────────────────────────
  // DELETE /categories/:id
  // ──────────────────────────────────────────────

  describe("DELETE /categories/:id", () => {
    it("deletes a category with no linked transactions", async () => {
      const createRes = await request
        .post("/categories")
        .set(authHeader(token))
        .send({ name: "ToDelete" })
        .expect(201);

      const id = createRes.body.data.id;

      await request.delete(`/categories/${id}`).set(authHeader(token)).expect(200);

      // Category should no longer appear in the list
      const listRes = await request.get("/categories").set(authHeader(token)).expect(200);
      const ids = listRes.body.data.map((c: { id: string }) => c.id);
      expect(ids).not.toContain(id);
    });

    it("returns 404 for a non-existent category", async () => {
      await request
        .delete("/categories/00000000-0000-0000-0000-000000000000")
        .set(authHeader(token))
        .expect(404);
    });

    it("returns 403 when deleting another user's category", async () => {
      const { token: otherToken } = await createTestUser();
      const createRes = await request
        .post("/categories")
        .set(authHeader(otherToken))
        .send({ name: "OtherCat" })
        .expect(201);

      await request
        .delete(`/categories/${createRes.body.data.id}`)
        .set(authHeader(token))
        .expect(403);
    });

    it("returns 401 without token", async () => {
      await request.delete("/categories/some-id").expect(401);
    });
  });
});
