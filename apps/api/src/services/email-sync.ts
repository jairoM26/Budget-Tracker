import prisma from "../prisma";
import { decrypt } from "../utils/encryption";
import { fetchEmailsBySubject, type ImapCredentials } from "./imap-client";
import { NotFoundError, ForbiddenError } from "../utils/errors";

interface SyncResult {
  connectionId: string;
  email: string;
  rulesProcessed: number;
  emailsFound: number;
  emailsStored: number;
  errors: string[];
}

export async function syncConnection(userId: string, connectionId: string): Promise<SyncResult> {
  const connection = await prisma.emailConnection.findUnique({
    where: { id: connectionId },
    include: { scanRules: { where: { active: true } } },
  });

  if (!connection) throw new NotFoundError("Email connection not found");
  if (connection.userId !== userId) throw new ForbiddenError();
  if (!connection.active) {
    return {
      connectionId,
      email: connection.email,
      rulesProcessed: 0,
      emailsFound: 0,
      emailsStored: 0,
      errors: ["Connection is disabled"],
    };
  }

  const credentials = JSON.parse(decrypt(connection.encryptedCreds)) as ImapCredentials;
  const since = connection.lastSyncAt ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default: 30 days back

  const result: SyncResult = {
    connectionId,
    email: connection.email,
    rulesProcessed: 0,
    emailsFound: 0,
    emailsStored: 0,
    errors: [],
  };

  for (const rule of connection.scanRules) {
    result.rulesProcessed++;

    try {
      const emails = await fetchEmailsBySubject(
        connection.email,
        credentials,
        rule.subjectFilter,
        since
      );

      result.emailsFound += emails.length;

      for (const email of emails) {
        // Dedup by matching from + subject + bodyText hash within this rule
        // Use a short body prefix for matching (first 200 chars) to catch identical emails
        const bodyPrefix = email.bodyText.substring(0, 200);
        const existing = await prisma.emailLog.findFirst({
          where: {
            userId,
            scanRuleId: rule.id,
            fromAddress: email.from,
            subject: email.subject,
            bodyText: { startsWith: bodyPrefix },
          },
        });

        if (existing) continue;

        await prisma.emailLog.create({
          data: {
            userId,
            scanRuleId: rule.id,
            fromAddress: email.from,
            subject: email.subject,
            bodyText: email.bodyText.substring(0, 10000), // cap at 10k chars
          },
        });

        result.emailsStored++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`Rule "${rule.subjectFilter}": ${message}`);
    }
  }

  // Update lastSyncAt
  await prisma.emailConnection.update({
    where: { id: connectionId },
    data: { lastSyncAt: new Date() },
  });

  return result;
}

export async function syncAllForUser(userId: string): Promise<SyncResult[]> {
  const connections = await prisma.emailConnection.findMany({
    where: { userId, active: true },
  });

  const results: SyncResult[] = [];

  for (const conn of connections) {
    const result = await syncConnection(userId, conn.id);
    results.push(result);
  }

  return results;
}

export async function getUnprocessedLogs(userId: string) {
  const logs = await prisma.emailLog.findMany({
    where: {
      userId,
      processedAt: null,
      errorMessage: null,
    },
    include: {
      scanRule: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    scanRuleId: log.scanRuleId,
    fromAddress: log.fromAddress,
    subject: log.subject,
    bodyText: log.bodyText,
    processedAt: log.processedAt?.toISOString() ?? null,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt.toISOString(),
    scanRule: log.scanRule ? {
      id: log.scanRule.id,
      subjectFilter: log.scanRule.subjectFilter,
    } : null,
  }));
}
