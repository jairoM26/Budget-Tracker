import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/errors";
import { CreateBudgetInput, UpdateBudgetInput, ListBudgetsInput } from "../validators/budgets";

const categorySelect = { id: true, name: true, color: true, icon: true };

function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // exclusive upper bound
  return { start, end };
}

function serializeBudgetCategory(
  bc: {
    id: string;
    limitAmount: Prisma.Decimal;
    category: { id: string; name: string; color: string; icon: string };
  },
  spentMap: Map<string, Prisma.Decimal>
) {
  const spent = spentMap.get(bc.category.id) ?? new Prisma.Decimal(0);
  return {
    id: bc.id,
    category: bc.category,
    limitAmount: bc.limitAmount.toFixed(2),
    spent: spent.toFixed(2),
  };
}

function serializeBudget(
  budget: {
    id: string;
    year: number;
    month: number;
    totalLimit: Prisma.Decimal;
    budgetCategories: Array<{
      id: string;
      limitAmount: Prisma.Decimal;
      category: { id: string; name: string; color: string; icon: string };
    }>;
  },
  spentMap: Map<string, Prisma.Decimal>
) {
  return {
    id: budget.id,
    year: budget.year,
    month: budget.month,
    totalLimit: budget.totalLimit.toFixed(2),
    categories: budget.budgetCategories.map((bc) => serializeBudgetCategory(bc, spentMap)),
  };
}

async function buildSpentMap(
  userId: string,
  year: number,
  month: number
): Promise<Map<string, Prisma.Decimal>> {
  const { start, end } = monthBounds(year, month);
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });

  const map = new Map<string, Prisma.Decimal>();
  for (const row of rows) {
    if (row._sum.amount !== null) {
      map.set(row.categoryId, row._sum.amount);
    }
  }
  return map;
}

export async function list(userId: string, input: ListBudgetsInput) {
  const where: Prisma.BudgetWhereInput = { userId };
  if (input.year !== undefined) where.year = input.year;
  if (input.month !== undefined) where.month = input.month;

  const budgets = await prisma.budget.findMany({
    where,
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      budgetCategories: {
        include: { category: { select: categorySelect } },
      },
    },
  });

  // Build spent maps per (year, month) combination
  const periods = new Set(budgets.map((b) => `${b.year}-${b.month}`));
  const spentMaps = new Map<string, Map<string, Prisma.Decimal>>();
  await Promise.all(
    Array.from(periods).map(async (key) => {
      const [y, m] = key.split("-").map(Number);
      spentMaps.set(key, await buildSpentMap(userId, y, m));
    })
  );

  return budgets.map((b) => {
    const spentMap = spentMaps.get(`${b.year}-${b.month}`) ?? new Map();
    return serializeBudget(b, spentMap);
  });
}

export async function create(userId: string, input: CreateBudgetInput) {
  const existing = await prisma.budget.findFirst({
    where: { userId, year: input.year, month: input.month },
  });
  if (existing) {
    throw new ConflictError(
      `A budget for ${input.year}-${String(input.month).padStart(2, "0")} already exists`
    );
  }

  const budget = await prisma.budget.create({
    data: {
      userId,
      year: input.year,
      month: input.month,
      totalLimit: input.totalLimit,
      budgetCategories: {
        create: input.categories.map((c) => ({
          categoryId: c.categoryId,
          limitAmount: c.limitAmount,
        })),
      },
    },
    include: {
      budgetCategories: {
        include: { category: { select: categorySelect } },
      },
    },
  });

  const spentMap = await buildSpentMap(userId, budget.year, budget.month);
  return serializeBudget(budget, spentMap);
}

export async function update(userId: string, id: string, input: UpdateBudgetInput) {
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Budget not found");
  if (existing.userId !== userId) throw new ForbiddenError();

  // Update totalLimit and upsert category limits atomically
  await prisma.$transaction(async (tx) => {
    if (input.totalLimit !== undefined) {
      await tx.budget.update({
        where: { id },
        data: { totalLimit: input.totalLimit },
      });
    }
    if (input.categories && input.categories.length > 0) {
      await Promise.all(
        input.categories.map((c) =>
          tx.budgetCategory.upsert({
            where: { budgetId_categoryId: { budgetId: id, categoryId: c.categoryId } },
            create: { budgetId: id, categoryId: c.categoryId, limitAmount: c.limitAmount },
            update: { limitAmount: c.limitAmount },
          })
        )
      );
    }
  });

  // Re-fetch with updated categories
  const refreshed = await prisma.budget.findUniqueOrThrow({
    where: { id },
    include: {
      budgetCategories: {
        include: { category: { select: categorySelect } },
      },
    },
  });

  const spentMap = await buildSpentMap(userId, refreshed.year, refreshed.month);
  return serializeBudget(refreshed, spentMap);
}

export async function remove(userId: string, id: string) {
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Budget not found");
  if (existing.userId !== userId) throw new ForbiddenError();

  await prisma.budget.delete({ where: { id } });
}
