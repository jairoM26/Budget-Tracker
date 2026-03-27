import { describe, it, expect } from "vitest";

// We can't test the IMAP connection itself (needs a real server),
// but we can test the MIME parsing by importing the module and
// testing the internal extraction logic indirectly.
// Since extractTextFromSource is not exported, we test it through
// a re-export for testing purposes.

// Instead, test the public testConnection with a mocked ImapFlow
import { vi } from "vitest";

vi.mock("imapflow", () => {
  return {
    ImapFlow: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      getMailboxLock: vi.fn().mockResolvedValue({ release: vi.fn() }),
      search: vi.fn().mockResolvedValue([]),
      fetch: vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.resolve({ done: true }),
        }),
      }),
    })),
  };
});

import { testConnection, fetchEmailsBySubject } from "../../src/services/imap-client";
import { ImapFlow } from "imapflow";

const MockImapFlow = ImapFlow as unknown as ReturnType<typeof vi.fn>;

describe("IMAP Client", () => {
  const creds = {
    provider: "IMAP" as const,
    host: "imap.example.com",
    port: 993,
    tls: true,
    password: "secret",
  };

  describe("testConnection", () => {
    it("returns success when connection works", async () => {
      const result = await testConnection("user@example.com", creds);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns error when connection fails", async () => {
      MockImapFlow.mockImplementationOnce(() => ({
        connect: vi.fn().mockRejectedValue(new Error("Auth failed")),
        logout: vi.fn().mockResolvedValue(undefined),
      }));

      const result = await testConnection("user@example.com", creds);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Auth failed");
    });
  });

  describe("fetchEmailsBySubject", () => {
    it("returns empty array when no emails match", async () => {
      const result = await fetchEmailsBySubject(
        "user@example.com",
        creds,
        "No match",
        new Date()
      );
      expect(result).toEqual([]);
    });

    it("creates client with correct config", async () => {
      await fetchEmailsBySubject("user@example.com", creds, "Test", new Date());

      expect(MockImapFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "imap.example.com",
          port: 993,
          secure: true,
          auth: { user: "user@example.com", pass: "secret" },
        })
      );
    });
  });
});
