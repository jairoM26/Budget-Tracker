import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { ForbiddenError, NotFoundError } from "../utils/errors";
import { CreateRecurringRuleInput, UpdateRecurringRuleInput } from "../validators/recurring-rules";

const categorySelect = { id: true, name: true, color: true, icon: true };

function serialize(rule: {
  id: string;
  amount: Prisma.Decimal;
  type: string;
  description: string;
  frequency: string;
  nextDue: Date;
  endDate: Date | null;
  active: boolean;
  category: { id: string; name: string; color: string; icon: string };
}) {
  return {
    id: rule.id,
    amount: rule.amount.toFixed(2),
    type: rule.type,
    description: rule.description,
    frequency: rule.frequency,
    nextDue: rule.nextDue.toISOString(),
    endDate: rule.endDate ? rule.endDate.toISOString() : null,
    active: rule.active,
    category: rule.category,
  };
}

async function verifyCategory(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundError("Category not found");
  if (category.userId !== userId) throw new ForbiddenError("Category does not belong to you");
  return category;
}

export async function list(userId: string) {
  const rules = await prisma.recurringRule.findMany({
    where: { userId },
    orderBy: { nextDue: "asc" },
    include: { category: { select: categorySelect } },
  });
  return rules.map(serialize);
}

export async function create(userId: string, input: CreateRecurringRuleInput) {
  await verifyCategory(input.categoryId, userId);

  const rule = await prisma.recurringRule.create({
    data: {
      userId,
      categoryId: input.categoryId,
      amount: input.amount,
      type: input.type,
      description: input.description,
      frequency: input.frequency,
      nextDue: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
    include: { category: { select: categorySelect } },
  });

  return serialize(rule);
}

export async function update(userId: string, id: string, input: UpdateRecurringRuleInput) {
  const existing = await prisma.recurringRule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Recurring rule not found");
  if (existing.userId !== userId) throw new ForbiddenError();

  if (input.categoryId) {
    await verifyCategory(input.categoryId, userId);
  }

  const rule = await prisma.recurringRule.update({
    where: { id },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.nextDue !== undefined && { nextDue: new Date(input.nextDue) }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate) : null }),
      ...(input.active !== undefined && { active: input.active }),
    },
    include: { category: { select: categorySelect } },
  });

  return serialize(rule);
}

export async function remove(userId: string, id: string) {
  const existing = await prisma.recurringRule.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Recurring rule not found");
  if (existing.userId !== userId) throw new ForbiddenError();

  await prisma.recurringRule.delete({ where: { id } });
}

// ─── Scheduler logic (T-061) ───────────────────────────────

/**
 * Compute the next due date after advancing from `current` by one `frequency` step.
 */
export function computeNextDue(current: Date, frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"): Date {
  const next = new Date(current);
  switch (frequency) {
    case "DAILY":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "MONTHLY":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case "YEARLY":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
  }
  return next;
}

/**
 * Process all recurring rules that are due on or before `asOf`.
 * For each due rule, create a transaction and advance nextDue.
 * Returns the number of transactions generated.
 */
export async function processDueRules(asOf: Date = new Date()): Promise<number> {
  const dueRules = await prisma.recurringRule.findMany({
    where: {
      active: true,
      nextDue: { lte: asOf },
      OR: [
        { endDate: null },
        { endDate: { gte: asOf } },
      ],
    },
  });

  let generated = 0;

  for (const rule of dueRules) {
    // A rule might be multiple periods behind (e.g., server was down).
    // Generate one transaction per missed period.
    let currentDue = new Date(rule.nextDue);

    while (currentDue <= asOf) {
      // If endDate is set and currentDue is past it, stop
      if (rule.endDate && currentDue > rule.endDate) break;

      await prisma.transaction.create({
        data: {
          userId: rule.userId,
          categoryId: rule.categoryId,
          amount: rule.amount,
          type: rule.type,
          description: rule.description,
          date: currentDue,
          recurringRuleId: rule.id,
        },
      });
      generated++;

      currentDue = computeNextDue(currentDue, rule.frequency);
    }

    // Update nextDue (and deactivate if past endDate)
    const pastEnd = rule.endDate && currentDue > rule.endDate;
    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: {
        nextDue: currentDue,
        ...(pastEnd && { active: false }),
      },
    });
  }

  return generated;
}
