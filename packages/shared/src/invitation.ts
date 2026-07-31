import { z } from "zod";

export const invitationStatusSchema = z.enum([
  "pending",
  "registered",
  "submitted",
  "expired",
]);

export const invitationGenerateInputSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1),
});

export const invitationGenerateOutputSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  token: z.string(),
  link: z.string().url(),
  expiresAt: z.string().datetime(),
});

export const invitationListItemSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  link: z.string().url(),
  status: invitationStatusSchema,
});

export type InvitationGenerateInput = z.infer<
  typeof invitationGenerateInputSchema
>;
export type InvitationGenerateOutput = z.infer<
  typeof invitationGenerateOutputSchema
>;
export type InvitationListItem = z.infer<typeof invitationListItemSchema>;
