import { z } from "zod";
import {
  addressSchema,
  emergencyContactSchema,
  onboardingApplicationDataSchema,
  workAuthorizationSchema,
} from "./onboarding.js";

export const employeeProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  data: onboardingApplicationDataSchema,
});

export const employeeProfileUpdateSectionInputSchema = z.discriminatedUnion(
  "section",
  [
    z.object({
      section: z.literal("name"),
      firstName: z.string().trim().min(1),
      lastName: z.string().trim().min(1),
      middleName: z.string().trim().optional(),
      preferredName: z.string().trim().optional(),
      profilePictureId: z.string().min(1).optional(),
      ssn: z
        .string()
        .trim()
        .regex(/^\d{3}-?\d{2}-?\d{4}$/, "Enter a valid SSN."),
      dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
      gender: z.enum(["male", "female", "decline"]),
    }),
    z.object({ section: z.literal("address"), address: addressSchema }),
    z.object({
      section: z.literal("contact"),
      cellPhone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/),
      workPhone: z.union([
        z.literal(""),
        z.string().regex(/^\d{3}-\d{3}-\d{4}$/),
      ]),
    }),
    z.object({
      section: z.literal("employment"),
      workAuthorization: workAuthorizationSchema,
      workAuthorizationDocumentId: z.string().min(1).optional(),
    }),
    z.object({
      section: z.literal("emergencyContact"),
      emergencyContacts: z
        .array(emergencyContactSchema)
        .min(1, "Add at least one emergency contact."),
    }),
  ],
);

export type EmployeeProfile = z.infer<typeof employeeProfileSchema>;
export type EmployeeProfileUpdateSectionInput = z.infer<
  typeof employeeProfileUpdateSectionInputSchema
>;
