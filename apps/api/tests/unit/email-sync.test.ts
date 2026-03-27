import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock imap-client before importing email-sync
vi.mock("../../src/services/imap-client", () => ({
  fetchEmailsBySubject: vi.fn(),
  testConnection: vi.fn(),
}));

import { fetchEmailsBySubject } from "../../src/services/imap-client";
import * as emailSyncService from "../../src/services/email-sync";
import prisma from "../../src/prisma";
import { encrypt } from "../../src/utils/encryption";

const mockFetch = fetchEmailsBySubject as ReturnType<typeof vi.fn>;

const IMAP_CREDS = {
  provider: "IMAP" as const,
  host: "imap.example.com",
  port: 993,
  tls: true,
  password: "secret",
};

async function createUserWithConnection() {
  const user = await prisma.user.create({
    data: {
      email: `sync-test-${Date.now()}@example.com`,
      passwordHash: "hashed",
      name: "Sync Test",
    },
  });

  const connection = await prisma.emailConnection.create({
    data: {
      userId: user.id,
      provider: "IMAP",
      email: "bank@example.com",
      encryptedCreds: encrypt(JSON.stringify(IMAP_CREDS)),
      active: true,
    },
  });

  const rule = await prisma.scanRule.create({
    data: {
      emailConnectionId: connection.id,
      subjectFilter: "Notificación de transacción",
      active: true,
    },
  });

  return { user, connection, rule };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Email Sync Service", () => {
  it("fetches emails and creates EmailLog records", async () => {
    const { user, connection } = await createUserWithConnection();

    mockFetch.mockResolvedValueOnce([
      {
        uid: 1001,
        from: "bank@notifications.com",
        subject: "Notificación de transacción",
        date: new Date("2026-03-25T10:00:00Z"),
        bodyText: "Comercio: Starbucks\nMonto: $45.00",
      },
      {
        uid: 1002,
        from: "bank@notifications.com",
        subject: "Notificación de transacción",
        date: new Date("2026-03-26T14:30:00Z"),
        bodyText: "Comercio: Amazon\nMonto: $120.50",
      },
    ]);

    const result = await emailSyncService.syncConnection(user.id, connection.id);

    expect(result.rulesProcessed).toBe(1);
    expect(result.emailsFound).toBe(2);
    expect(result.emailsStored).toBe(2);
    expect(result.errors).toHaveLength(0);

    // Verify EmailLog records were created
    const logs = await prisma.emailLog.findMany({ where: { userId: user.id } });
    expect(logs).toHaveLength(2);
    expect(logs.some((l) => l.subject === "Notificación de transacción")).toBe(true);
  });

  it("deduplicates emails on subsequent syncs", async () => {
    const { user, connection } = await createUserWithConnection();

    const emails = [
      {
        uid: 1001,
        from: "bank@notifications.com",
        subject: "Notificación de transacción",
        date: new Date("2026-03-25T10:00:00Z"),
        bodyText: "Comercio: Starbucks\nMonto: $45.00",
      },
    ];

    mockFetch.mockResolvedValueOnce(emails);
    await emailSyncService.syncConnection(user.id, connection.id);

    // Sync again with the same email
    mockFetch.mockResolvedValueOnce(emails);
    const result = await emailSyncService.syncConnection(user.id, connection.id);

    expect(result.emailsFound).toBe(1);
    expect(result.emailsStored).toBe(0); // duplicate skipped

    const logs = await prisma.emailLog.findMany({ where: { userId: user.id } });
    expect(logs).toHaveLength(1);
  });

  it("updates lastSyncAt after sync", async () => {
    const { user, connection } = await createUserWithConnection();

    mockFetch.mockResolvedValueOnce([]);

    await emailSyncService.syncConnection(user.id, connection.id);

    const updated = await prisma.emailConnection.findUnique({ where: { id: connection.id } });
    expect(updated?.lastSyncAt).not.toBeNull();
  });

  it("returns error for disabled connection", async () => {
    const { user, connection } = await createUserWithConnection();

    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: { active: false },
    });

    const result = await emailSyncService.syncConnection(user.id, connection.id);

    expect(result.rulesProcessed).toBe(0);
    expect(result.errors).toContain("Connection is disabled");
  });

  it("captures IMAP errors per rule without stopping sync", async () => {
    const { user, connection } = await createUserWithConnection();

    mockFetch.mockRejectedValueOnce(new Error("IMAP connection timeout"));

    const result = await emailSyncService.syncConnection(user.id, connection.id);

    expect(result.rulesProcessed).toBe(1);
    expect(result.emailsStored).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("IMAP connection timeout");
  });

  it("throws 404 for non-existent connection", async () => {
    const { user } = await createUserWithConnection();

    await expect(
      emailSyncService.syncConnection(user.id, "00000000-0000-0000-0000-000000000000")
    ).rejects.toThrow("Email connection not found");
  });

  it("throws 403 for another user's connection", async () => {
    const { connection } = await createUserWithConnection();
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}@example.com`,
        passwordHash: "hashed",
        name: "Other",
      },
    });

    await expect(
      emailSyncService.syncConnection(otherUser.id, connection.id)
    ).rejects.toThrow("Access denied");
  });

  it("lists unprocessed logs", async () => {
    const { user, connection } = await createUserWithConnection();

    mockFetch.mockResolvedValueOnce([
      {
        uid: 1,
        from: "bank@test.com",
        subject: "Transaction",
        date: new Date(),
        bodyText: "Amount: $50",
      },
    ]);

    await emailSyncService.syncConnection(user.id, connection.id);

    const logs = await emailSyncService.getUnprocessedLogs(user.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].fromAddress).toBe("bank@test.com");
    expect(logs[0].processedAt).toBeNull();
  });
});
