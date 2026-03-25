import { z } from "zod";
import { monetaryAmount } from "./common";

export const createRecurringRuleSchema = z.object({
  amount: monetaryAmount,
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().uuid("Must be a valid category UUID"),
  description: z.string().min(1, "Description is required").max(200, "Description must be 200 characters or fewer"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullable().optional(),
});

export const updateRecurringRuleSchema = z.object({
  amount: monetaryAmount.optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  categoryId: z.string().uuid("Must be a valid category UUID").optional(),
  description: z.string().min(1, "Description is required").max(200, "Description must be 200 characters or fewer").optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  nextDue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullable().optional(),
  active: z.boolean().optional(),
});

export type CreateRecurringRuleInput = z.infer<typeof createRecurringRuleSchema>;
export type UpdateRecurringRuleInput = z.infer<typeof updateRecurringRuleSchema>;
