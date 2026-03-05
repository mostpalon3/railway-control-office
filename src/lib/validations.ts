import { z } from "zod";

// ──────────────────────────────────────────
// Auth
// ──────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignupFormValues = z.infer<typeof signupSchema>;

// ──────────────────────────────────────────
// Session  (mirrors: public.sessions)
// ──────────────────────────────────────────
export const sessionSchema = z.object({
  name: z.string().min(1, "Session name is required"),
  started_at: z.string().optional(),
  ended_at: z.string().nullable().optional(),
});
export type SessionFormValues = z.infer<typeof sessionSchema>;

// ──────────────────────────────────────────
// Entry  (mirrors: public.entries)
// ──────────────────────────────────────────
export const CHART_NO_VALUES = [
  "1", "2", "3", "4", "5", "6",
  "7", "8", "9", "10", "11", "12",
  "3A",
] as const;

export const entrySchema = z.object({
  session_id: z.string().min(1, "Invalid session"),
  loco1: z.string().min(1, "Loco 1 is required"),
  loco2: z.string().optional(),
  train_no: z.string().min(1, "Train name is required"),
  station: z.string().min(1, "Station is required"),
  chart_no: z.enum(CHART_NO_VALUES, {
    error: () => "Chart no. must be 1–12 or 3A",
  }),
  sno: z
    .number({ error: () => "S. No is required" })
    .int("Must be a whole number")
    .min(1, "S. No is required"),
  date: z.string().min(1, "Date is required"),
  shutdown: z.boolean(),
  shed1: z.string().optional(),
  shed2: z.string().optional(),
});
export type EntryFormValues = z.infer<typeof entrySchema>;
