import { z } from "zod";

export const userRoleSchema = z.enum(["employee", "hr"]);

export const sessionUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.email(),
  role: userRoleSchema,
});

export const authRegisterInputSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
});

export const authLoginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authLogoutOutputSchema = z.object({
  success: z.literal(true),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type AuthRegisterInput = z.infer<typeof authRegisterInputSchema>;
export type AuthLoginInput = z.infer<typeof authLoginInputSchema>;
export type AuthLogoutOutput = z.infer<typeof authLogoutOutputSchema>;
