import { z } from "zod";
import { monetaryAmount, paginationSchema } from "./common";

export const createTransactionSchema = z.object({
  amount: monetaryAmount,
  type: z.enum(["INCOME", "EXPENSE"], { required_error: "Type is required" }),
  categoryId: z.string().uuid("Must be a valid category ID"),
  description: z.string().min(1, "Description is required").max(255, "Description must be 255 characters or fewer"),
  notes: z.string().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date in YYYY-MM-DD format"),
});

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  notes: z.string().max(1000).nullable().optional(),
});

export const listTransactionsSchema = paginationSchema.extend({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
  categoryId: z.string().uuid("Must be a valid category ID").optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;
