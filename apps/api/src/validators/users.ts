import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "./auth";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or fewer").optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
