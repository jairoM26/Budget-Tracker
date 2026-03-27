import { beforeAll, afterEach, afterAll } from "vitest";
import prisma from "../src/prisma";

// Ensure ENCRYPTION_KEY is set for tests that use email connections
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = "test-encryption-key-at-least-32-characters-long";
}

beforeAll(async () => {
  await cleanDatabase();
});

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function cleanDatabase() {
  await prisma.pendingTransaction.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.scanRule.deleteMany();
  await prisma.emailConnection.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budgetCategory.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.recurringRule.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}
