import { z } from "zod";
import { employeeProfileSchema } from "./profile.js";

export const userIdInputSchema = z.object({ userId: z.string().min(1) });
export const employeeSearchInputSchema = z.object({ query: z.string() });
export const visaSearchInputSchema = z.object({ query: z.string().optional() });

export const workAuthorizationViewSchema = z.object({
  title: z.string().nullable(),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
});

export const employeeSummarySchema = z.object({
  userId: z.string(),
  profileId: z.string(),
  fullName: z.string(),
  ssn: z.string().nullable(),
  workAuthorization: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.email().nullable(),
});

export const employeeListSchema = z.object({
  total: z.number().int().nonnegative(),
  employees: z.array(employeeSummarySchema),
});

export const visaProgressItemSchema = z.object({
  userId: z.string().nullable(),
  invitationId: z.string().nullable(),
  fullName: z.string(),
  email: z.email(),
  workAuthorization: workAuthorizationViewSchema,
  daysRemaining: z.number().int().nullable(),
  nextStep: z.string(),
  waitingOn: z.enum(["employee", "hr"]),
  step: z
    .enum(["application", "optReceipt", "optEad", "i983", "i20"])
    .nullable(),
  pendingFile: z.string().nullable(),
  canNotify: z.boolean(),
});

export const visaAllItemSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  workAuthorization: workAuthorizationViewSchema,
  daysRemaining: z.number().int().nullable(),
  nextStep: z.string(),
  approvedDocuments: z.array(
    z.object({
      step: z.enum(["optReceipt", "optEad", "i983", "i20"]),
      label: z.string(),
      file: z.string(),
    }),
  ),
});

export const sendNotificationInputSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("employee"),
    userId: z.string().min(1),
    message: z.string().optional(),
  }),
  z.object({
    target: z.literal("invitation"),
    invitationId: z.string().min(1),
    message: z.string().optional(),
  }),
]);

export const sendNotificationOutputSchema = z.object({
  ok: z.literal(true),
  to: z.email(),
  nextStep: z.string(),
});

export { employeeProfileSchema };

export type EmployeeSummary = z.infer<typeof employeeSummarySchema>;
export type VisaProgressItem = z.infer<typeof visaProgressItemSchema>;
export type VisaAllItem = z.infer<typeof visaAllItemSchema>;
