import { describe, it, expect, beforeEach } from "vitest";
import { request, createTestUser, authHeader } from "../helpers";

const IMAP_INPUT = {
  provider: "IMAP" as const,
  email: "bank@example.com",
  credentials: {
    provider: "IMAP" as const,
    host: "imap.example.com",
    port: 993,
    tls: true,
    password: "my-secret-password",
  },
};

let token: string;
let otherToken: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = user.token;
  const other = await createTestUser({ email: `other-${Date.now()}@example.com` });
  otherToken = other.token;
});

describe("Email Connections CRUD", () => {
  it("creates an email connection", async () => {
    const res = await request
      .post("/email-connections")
      .set(authHeader(token))
      .send(IMAP_INPUT)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toBe("IMAP");
    expect(res.body.data.email).toBe("bank@example.com");
    expect(res.body.data.active).toBe(true);
    expect(res.body.data.lastSyncAt).toBeNull();
    // Credentials must NOT be in the response
    expect(res.body.data.encryptedCreds).toBeUndefined();
    expect(res.body.data.credentials).toBeUndefined();
  });

  it("lists email connections for the authenticated user", async () => {
    await request.post("/email-connections").set(authHeader(token)).send(IMAP_INPUT).expect(201);

    const res = await request.get("/email-connections").set(authHeader(token)).expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe("bank@example.com");
  });

  it("does not list another user's connections", async () => {
    await request.post("/email-connections").set(authHeader(token)).send(IMAP_INPUT).expect(201);

    const res = await request.get("/email-connections").set(authHeader(otherToken)).expect(200);

    expect(res.body.data).toHaveLength(0);
  });

  it("gets a single connection by ID", async () => {
    const created = await request
      .post("/email-connections")
      .set(authHeader(token))
      .send(IMAP_INPUT)
      .expect(201);

    const res = await request
      .get(`/email-connections/${created.body.data.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.data.id).toBe(created.body.data.id);
  });

  it("returns 403 when accessing another user's connection", async () => {
    const created = await request
      .post("/email-connections")
      .set(authHeader(token))
      .send(IMAP_INPUT)
      .expect(201);

    await request
      .get(`/email-connections/${created.body.data.id}`)
      .set(authHeader(otherToken))
      .expect(403);
  });

  it("returns 404 for non-existent connection", async () => {
    await request
      .get("/email-connections/00000000-0000-0000-0000-000000000000")
      .set(authHeader(token))
      .expect(404);
  });

  it("updates a connection (toggle active)", async () => {
    const created = await request
      .post("/email-connections")
      .set(authHeader(token))
      .send(IMAP_INPUT)
      .expect(201);

    const res = await request
      .patch(`/email-connections/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ active: false })
      .expect(200);

    expect(res.body.data.active).toBe(false);
  });

  it("returns 403 when updating another user's connection", async () => {
    const created = await request
      .post("/email-connections")
      .set(authHeader(token))
      .send(IMAP_INPUT)
      .expect(201);

    await request
      .patch(`/email-connections/${created.body.data.id}`)
      .set(authHeader(otherToken))
      .send({ active: false })
      .expect(403);
  });

  it("deletes a connection", async () => {
    const created = await request
      .post("/email-connections")
      .set(authHeader(token))
      .send(IMAP_INPUT)
      .expect(201);

    await request
      .delete(`/email-connections/${created.body.data.id}`)
      .set(authHeader(token))
      .expect(200);

    await request
      .get(`/email-connections/${created.body.data.id}`)
      .set(authHeader(token))
      .expect(404);
  });

  it("returns 403 when deleting another user's connection", async () => {
    const created = await request
      .post("/email-connections")
      .set(authHeader(token))
      .send(IMAP_INPUT)
      .expect(201);

    await request
      .delete(`/email-connections/${created.body.data.id}`)
      .set(authHeader(otherToken))
      .expect(403);
  });

  it("returns 401 without auth token", async () => {
    await request.get("/email-connections").expect(401);
    await request.post("/email-connections").send(IMAP_INPUT).expect(401);
  });

  it("validates required fields on create", async () => {
    await request
      .post("/email-connections")
      .set(authHeader(token))
      .send({ provider: "IMAP" })
      .expect(400);
  });
});

describe("Scan Rules CRUD", () => {
  let connectionId: string;

  beforeEach(async () => {
    const res = await request
      .post("/email-connections")
      .set(authHeader(token))
      .send(IMAP_INPUT)
      .expect(201);
    connectionId = res.body.data.id;
  });

  it("creates a scan rule", async () => {
    const res = await request
      .post(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .send({ subjectFilter: "Notificación de transacción" })
      .expect(201);

    expect(res.body.data.subjectFilter).toBe("Notificación de transacción");
    expect(res.body.data.active).toBe(true);
    expect(res.body.data.emailConnectionId).toBe(connectionId);
  });

  it("lists scan rules for a connection", async () => {
    await request
      .post(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .send({ subjectFilter: "Rule 1" })
      .expect(201);
    await request
      .post(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .send({ subjectFilter: "Rule 2" })
      .expect(201);

    const res = await request
      .get(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.data).toHaveLength(2);
  });

  it("returns scan rules when getting connection", async () => {
    await request
      .post(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .send({ subjectFilter: "Test filter" })
      .expect(201);

    const res = await request
      .get(`/email-connections/${connectionId}`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.data.scanRules).toHaveLength(1);
    expect(res.body.data.scanRules[0].subjectFilter).toBe("Test filter");
  });

  it("updates a scan rule", async () => {
    const created = await request
      .post(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .send({ subjectFilter: "Original" })
      .expect(201);

    const res = await request
      .patch(`/email-connections/${connectionId}/scan-rules/${created.body.data.id}`)
      .set(authHeader(token))
      .send({ subjectFilter: "Updated", active: false })
      .expect(200);

    expect(res.body.data.subjectFilter).toBe("Updated");
    expect(res.body.data.active).toBe(false);
  });

  it("deletes a scan rule", async () => {
    const created = await request
      .post(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .send({ subjectFilter: "To delete" })
      .expect(201);

    await request
      .delete(`/email-connections/${connectionId}/scan-rules/${created.body.data.id}`)
      .set(authHeader(token))
      .expect(200);

    const res = await request
      .get(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .expect(200);

    expect(res.body.data).toHaveLength(0);
  });

  it("returns 403 when accessing another user's connection's scan rules", async () => {
    await request
      .get(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(otherToken))
      .expect(403);
  });

  it("returns 404 for scan rules of non-existent connection", async () => {
    await request
      .get("/email-connections/00000000-0000-0000-0000-000000000000/scan-rules")
      .set(authHeader(token))
      .expect(404);
  });

  it("cascades delete: removing connection removes scan rules", async () => {
    await request
      .post(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .send({ subjectFilter: "Will be cascaded" })
      .expect(201);

    await request
      .delete(`/email-connections/${connectionId}`)
      .set(authHeader(token))
      .expect(200);

    // Connection is gone, so 404
    await request
      .get(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .expect(404);
  });

  it("validates subjectFilter is required", async () => {
    await request
      .post(`/email-connections/${connectionId}/scan-rules`)
      .set(authHeader(token))
      .send({})
      .expect(400);
  });
});
