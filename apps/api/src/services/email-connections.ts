import prisma from "../prisma";
import { encrypt, decrypt } from "../utils/encryption";
import { NotFoundError, ForbiddenError } from "../utils/errors";
import type {
  CreateEmailConnectionInput,
  UpdateEmailConnectionInput,
  CreateScanRuleInput,
  UpdateScanRuleInput,
} from "../validators/email-connections";

// --- EmailConnection ---

interface SerializedEmailConnection {
  id: string;
  userId: string;
  provider: string;
  email: string;
  active: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  scanRules?: SerializedScanRule[];
}

interface SerializedScanRule {
  id: string;
  emailConnectionId: string;
  subjectFilter: string;
  active: boolean;
  createdAt: string;
}

function serializeConnection(conn: {
  id: string;
  userId: string;
  provider: string;
  email: string;
  active: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  scanRules?: { id: string; emailConnectionId: string; subjectFilter: string; active: boolean; createdAt: Date }[];
}): SerializedEmailConnection {
  return {
    id: conn.id,
    userId: conn.userId,
    provider: conn.provider,
    email: conn.email,
    active: conn.active,
    lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
    createdAt: conn.createdAt.toISOString(),
    ...(conn.scanRules && {
      scanRules: conn.scanRules.map(serializeScanRule),
    }),
  };
}

function serializeScanRule(rule: {
  id: string;
  emailConnectionId: string;
  subjectFilter: string;
  active: boolean;
  createdAt: Date;
}): SerializedScanRule {
  return {
    id: rule.id,
    emailConnectionId: rule.emailConnectionId,
    subjectFilter: rule.subjectFilter,
    active: rule.active,
    createdAt: rule.createdAt.toISOString(),
  };
}

export async function listConnections(userId: string) {
  const connections = await prisma.emailConnection.findMany({
    where: { userId },
    include: { scanRules: true },
    orderBy: { createdAt: "desc" },
  });
  return connections.map(serializeConnection);
}

export async function getConnection(userId: string, id: string) {
  const conn = await prisma.emailConnection.findUnique({
    where: { id },
    include: { scanRules: true },
  });

  if (!conn) throw new NotFoundError("Email connection not found");
  if (conn.userId !== userId) throw new ForbiddenError();

  return serializeConnection(conn);
}

export async function createConnection(userId: string, input: CreateEmailConnectionInput) {
  const encryptedCreds = encrypt(JSON.stringify(input.credentials));

  const conn = await prisma.emailConnection.create({
    data: {
      userId,
      provider: input.provider,
      email: input.email,
      encryptedCreds,
    },
    include: { scanRules: true },
  });

  return serializeConnection(conn);
}

export async function updateConnection(userId: string, id: string, input: UpdateEmailConnectionInput) {
  const existing = await prisma.emailConnection.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Email connection not found");
  if (existing.userId !== userId) throw new ForbiddenError();

  const data: { active?: boolean; encryptedCreds?: string } = {};
  if (input.active !== undefined) data.active = input.active;
  if (input.credentials) data.encryptedCreds = encrypt(JSON.stringify(input.credentials));

  const conn = await prisma.emailConnection.update({
    where: { id },
    data,
    include: { scanRules: true },
  });

  return serializeConnection(conn);
}

export async function removeConnection(userId: string, id: string) {
  const existing = await prisma.emailConnection.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Email connection not found");
  if (existing.userId !== userId) throw new ForbiddenError();

  await prisma.emailConnection.delete({ where: { id } });
}

export function getDecryptedCredentials(encryptedCreds: string): unknown {
  return JSON.parse(decrypt(encryptedCreds));
}

// --- ScanRule ---

export async function listScanRules(userId: string, connectionId: string) {
  const conn = await prisma.emailConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new NotFoundError("Email connection not found");
  if (conn.userId !== userId) throw new ForbiddenError();

  const rules = await prisma.scanRule.findMany({
    where: { emailConnectionId: connectionId },
    orderBy: { createdAt: "desc" },
  });

  return rules.map(serializeScanRule);
}

export async function createScanRule(userId: string, connectionId: string, input: CreateScanRuleInput) {
  const conn = await prisma.emailConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new NotFoundError("Email connection not found");
  if (conn.userId !== userId) throw new ForbiddenError();

  const rule = await prisma.scanRule.create({
    data: {
      emailConnectionId: connectionId,
      subjectFilter: input.subjectFilter,
    },
  });

  return serializeScanRule(rule);
}

export async function updateScanRule(userId: string, connectionId: string, ruleId: string, input: UpdateScanRuleInput) {
  const conn = await prisma.emailConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new NotFoundError("Email connection not found");
  if (conn.userId !== userId) throw new ForbiddenError();

  const rule = await prisma.scanRule.findUnique({ where: { id: ruleId } });
  if (!rule) throw new NotFoundError("Scan rule not found");
  if (rule.emailConnectionId !== connectionId) throw new ForbiddenError();

  const updated = await prisma.scanRule.update({
    where: { id: ruleId },
    data: {
      ...(input.subjectFilter !== undefined && { subjectFilter: input.subjectFilter }),
      ...(input.active !== undefined && { active: input.active }),
    },
  });

  return serializeScanRule(updated);
}

export async function removeScanRule(userId: string, connectionId: string, ruleId: string) {
  const conn = await prisma.emailConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new NotFoundError("Email connection not found");
  if (conn.userId !== userId) throw new ForbiddenError();

  const rule = await prisma.scanRule.findUnique({ where: { id: ruleId } });
  if (!rule) throw new NotFoundError("Scan rule not found");
  if (rule.emailConnectionId !== connectionId) throw new ForbiddenError();

  await prisma.scanRule.delete({ where: { id: ruleId } });
}
