import { z } from "zod";

export const monthlySummarySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const spendingByCategorySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const monthlyTrendSchema = z.object({
  months: z.coerce.number().int().min(1).max(12).default(6),
});

export type MonthlySummaryInput = z.infer<typeof monthlySummarySchema>;
export type SpendingByCategoryInput = z.infer<typeof spendingByCategorySchema>;
export type MonthlyTrendInput = z.infer<typeof monthlyTrendSchema>;
