import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { MonthlySummaryInput, SpendingByCategoryInput, MonthlyTrendInput } from "../validators/reports";

function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export async function monthlySummary(userId: string, input: MonthlySummaryInput) {
  const { year, month } = input;
  const { start, end } = monthBounds(year, month);

  const result = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      userId,
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });

  let totalIncome = new Prisma.Decimal(0);
  let totalExpenses = new Prisma.Decimal(0);

  for (const row of result) {
    if (row.type === "INCOME") {
      totalIncome = row._sum.amount ?? new Prisma.Decimal(0);
    } else {
      totalExpenses = row._sum.amount ?? new Prisma.Decimal(0);
    }
  }

  const netBalance = totalIncome.minus(totalExpenses);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { currency: true },
  });

  return {
    year,
    month,
    totalIncome: totalIncome.toFixed(2),
    totalExpenses: totalExpenses.toFixed(2),
    netBalance: netBalance.toFixed(2),
    currency: user.currency,
  };
}

export async function spendingByCategory(userId: string, input: SpendingByCategoryInput) {
  const { year, month } = input;
  const { start, end } = monthBounds(year, month);

  // Get expense spending grouped by category
  const spending = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });

  // Get categories for this user
  const categoryIds = spending.map((s) => s.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, userId },
    select: { id: true, name: true, color: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Get budget limits for this month
  const budget = await prisma.budget.findUnique({
    where: { userId_year_month: { userId, year, month } },
    include: {
      budgetCategories: {
        select: { categoryId: true, limitAmount: true },
      },
    },
  });
  const limitMap = new Map<string, Prisma.Decimal>();
  if (budget) {
    for (const bc of budget.budgetCategories) {
      limitMap.set(bc.categoryId, bc.limitAmount);
    }
  }

  return spending.map((row) => {
    const spent = row._sum.amount ?? new Prisma.Decimal(0);
    const category = categoryMap.get(row.categoryId);
    const budgetLimit = limitMap.get(row.categoryId);

    return {
      category: category ?? { id: row.categoryId, name: "Unknown", color: "#888888" },
      spent: spent.toFixed(2),
      budgetLimit: budgetLimit ? budgetLimit.toFixed(2) : null,
      percentage: budgetLimit && !budgetLimit.isZero()
        ? parseFloat(spent.div(budgetLimit).mul(100).toFixed(1))
        : null,
    };
  });
}

export async function monthlyTrend(userId: string, input: MonthlyTrendInput) {
  const { months } = input;

  // Calculate start date: N months ago from today
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-indexed

  const startDate = new Date(Date.UTC(currentYear, currentMonth - months + 1, 1));
  const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 1));

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lt: endDate },
    },
    select: {
      amount: true,
      type: true,
      date: true,
    },
  });

  // Group by year-month
  const monthMap = new Map<string, { income: Prisma.Decimal; expenses: Prisma.Decimal }>();

  // Initialize all months in range
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(currentYear, currentMonth - months + 1 + i, 1));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    monthMap.set(key, { income: new Prisma.Decimal(0), expenses: new Prisma.Decimal(0) });
  }

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const key = `${txDate.getUTCFullYear()}-${txDate.getUTCMonth() + 1}`;
    const entry = monthMap.get(key);
    if (entry) {
      if (tx.type === "INCOME") {
        entry.income = entry.income.add(tx.amount);
      } else {
        entry.expenses = entry.expenses.add(tx.amount);
      }
    }
  }

  const result: { year: number; month: number; totalIncome: string; totalExpenses: string }[] = [];
  for (const [key, val] of monthMap) {
    const [y, m] = key.split("-").map(Number);
    result.push({
      year: y,
      month: m,
      totalIncome: val.income.toFixed(2),
      totalExpenses: val.expenses.toFixed(2),
    });
  }

  // Sort chronologically
  result.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  return result;
}
