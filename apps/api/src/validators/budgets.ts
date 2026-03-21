import { z } from "zod";
import { monetaryAmount } from "./common";

const budgetCategoryInput = z.object({
  categoryId: z.string().uuid("Must be a valid category UUID"),
  limitAmount: monetaryAmount,
});

export const createBudgetSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  totalLimit: monetaryAmount,
  categories: z.array(budgetCategoryInput).default([]),
});

export const updateBudgetSchema = z.object({
  totalLimit: monetaryAmount.optional(),
  categories: z.array(budgetCategoryInput).optional(),
});

export const listBudgetsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type ListBudgetsInput = z.infer<typeof listBudgetsSchema>;
