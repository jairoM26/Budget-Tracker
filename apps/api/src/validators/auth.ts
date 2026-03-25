import { z } from "zod";

export const SUPPORTED_CURRENCIES = ["USD", "CRC"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const registerSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
});

export const loginSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
