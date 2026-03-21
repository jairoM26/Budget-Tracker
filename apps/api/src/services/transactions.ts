import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { ForbiddenError, NotFoundError } from "../utils/errors";
import { CreateTransactionInput, UpdateTransactionInput, ListTransactionsInput } from "../validators/transactions";

const categorySelect = { id: true, name: true, color: true, icon: true };

function serialize(tx: {
  id: string;
  amount: Prisma.Decimal;
  type: string;
  description: string;
  notes: string | null;
  date: Date;
  recurringRuleId: string | null;
  category: { id: string; name: string; color: string; icon: string };
}) {
  return {
    id: tx.id,
    amount: tx.amount.toFixed(2),
    type: tx.type,
    description: tx.description,
    notes: tx.notes,
    date: tx.date.toISOString(),
    category: tx.category,
    recurringRuleId: tx.recurringRuleId,
  };
}

async function verifyCategory(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundError("Category not found");
  if (category.userId !== userId) throw new ForbiddenError("Category does not belong to you");
  return category;
}

export async function list(userId: string, input: ListTransactionsInput) {
  const { page, limit, from, to, categoryId, type } = input;

  const where: Prisma.TransactionWhereInput = { userId };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
  }
  if (categoryId) where.categoryId = categoryId;
  if (type) where.type = type;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: "desc" },
      include: { category: { select: categorySelect } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data: transactions.map(serialize),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function create(userId: string, input: CreateTransactionInput) {
  await verifyCategory(input.categoryId, userId);

  const tx = await prisma.transaction.create({
    data: {
      userId,
      categoryId: input.categoryId,
      amount: input.amount,
      type: input.type,
      description: input.description,
      notes: input.notes ?? null,
      date: new Date(input.date),
    },
    include: { category: { select: categorySelect } },
  });

  return serialize(tx);
}

export async function update(userId: string, id: string, input: UpdateTransactionInput) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Transaction not found");
  if (existing.userId !== userId) throw new ForbiddenError();

  if (input.categoryId) {
    await verifyCategory(input.categoryId, userId);
  }

  const tx = await prisma.transaction.update({
    where: { id },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.date !== undefined && { date: new Date(input.date) }),
    },
    include: { category: { select: categorySelect } },
  });

  return serialize(tx);
}

export async function remove(userId: string, id: string) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Transaction not found");
  if (existing.userId !== userId) throw new ForbiddenError();

  await prisma.transaction.delete({ where: { id } });
}
