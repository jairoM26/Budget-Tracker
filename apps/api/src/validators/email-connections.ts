import { z } from "zod";

export const createEmailConnectionSchema = z.object({
  provider: z.enum(["IMAP", "GMAIL"]),
  email: z.string().email("Must be a valid email address"),
  credentials: z.union([
    z.object({
      provider: z.literal("IMAP"),
      host: z.string().min(1, "IMAP host is required"),
      port: z.number().int().min(1).max(65535).default(993),
      tls: z.boolean().default(true),
      password: z.string().min(1, "Password is required"),
    }),
    z.object({
      provider: z.literal("GMAIL"),
      accessToken: z.string().min(1, "Access token is required"),
      refreshToken: z.string().min(1, "Refresh token is required"),
    }),
  ]),
});

export const updateEmailConnectionSchema = z.object({
  active: z.boolean().optional(),
  credentials: z.union([
    z.object({
      provider: z.literal("IMAP"),
      host: z.string().min(1, "IMAP host is required"),
      port: z.number().int().min(1).max(65535).default(993),
      tls: z.boolean().default(true),
      password: z.string().min(1, "Password is required"),
    }),
    z.object({
      provider: z.literal("GMAIL"),
      accessToken: z.string().min(1, "Access token is required"),
      refreshToken: z.string().min(1, "Refresh token is required"),
    }),
  ]).optional(),
});

export const createScanRuleSchema = z.object({
  subjectFilter: z.string().min(1, "Subject filter is required").max(200, "Subject filter must be 200 characters or fewer"),
});

export const updateScanRuleSchema = z.object({
  subjectFilter: z.string().min(1, "Subject filter is required").max(200, "Subject filter must be 200 characters or fewer").optional(),
  active: z.boolean().optional(),
});

export type CreateEmailConnectionInput = z.infer<typeof createEmailConnectionSchema>;
export type UpdateEmailConnectionInput = z.infer<typeof updateEmailConnectionSchema>;
export type CreateScanRuleInput = z.infer<typeof createScanRuleSchema>;
export type UpdateScanRuleInput = z.infer<typeof updateScanRuleSchema>;
