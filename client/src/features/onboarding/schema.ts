import { z } from "zod";

import type { OnboardingFormData } from "@/lib/onboarding";

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);
const optionalText = z.string().trim();
const optionalEmail = z.union([
  z.literal(""),
  z.string().trim().email("Enter a valid email address."),
]);
const phoneNumber = z
  .string()
  .regex(/^\d{3}-\d{3}-\d{4}$/, "Enter a valid U.S. phone number.");
const optionalPhoneNumber = z.union([z.literal(""), phoneNumber]);

const personNameSchema = z.object({
  firstName: requiredText("First name"),
  middleName: optionalText,
  lastName: requiredText("Last name"),
  preferredName: optionalText,
});

const emergencyContactSchema = z.object({
  firstName: requiredText("First name"),
  middleName: optionalText,
  lastName: requiredText("Last name"),
  phone: optionalPhoneNumber,
  email: optionalEmail,
  relationship: requiredText("Relationship"),
});

const referenceSchema = z
  .object({
    firstName: optionalText,
    middleName: optionalText,
    lastName: optionalText,
    phone: optionalPhoneNumber,
    email: optionalEmail,
    relationship: optionalText,
  })
  .superRefine((reference, context) => {
    if (!Object.values(reference).some(Boolean)) return;

    for (const [field, label] of [
      ["firstName", "First name"],
      ["lastName", "Last name"],
      ["relationship", "Relationship"],
    ] as const) {
      if (!reference[field]) {
        context.addIssue({
          code: "custom",
          message: `${label} is required when adding a reference.`,
          path: [field],
        });
      }
    }
  });

const workAuthorizationSchema = z
  .object({
    isUsCitizenOrPermanentResident: z.boolean().nullable(),
    residentOrCitizenType: z.enum(["green_card", "citizen"]).nullable(),
    type: z.enum(["h1b", "l2", "f1", "h4", "other"]).nullable(),
    otherType: optionalText,
    startDate: optionalText,
    endDate: optionalText,
  })
  .superRefine((authorization, context) => {
    if (authorization.isUsCitizenOrPermanentResident === null) {
      context.addIssue({
        code: "custom",
        message: "Select an answer.",
        path: ["isUsCitizenOrPermanentResident"],
      });
      return;
    }

    if (authorization.isUsCitizenOrPermanentResident) {
      if (!authorization.residentOrCitizenType) {
        context.addIssue({
          code: "custom",
          message: "Select Green Card or Citizen.",
          path: ["residentOrCitizenType"],
        });
      }
      return;
    }

    if (!authorization.type) {
      context.addIssue({
        code: "custom",
        message: "Select a work-authorization type.",
        path: ["type"],
      });
    }
    if (authorization.type === "other" && !authorization.otherType) {
      context.addIssue({
        code: "custom",
        message: "Enter the visa title.",
        path: ["otherType"],
      });
    }
    for (const [field, label] of [
      ["startDate", "Start date"],
      ["endDate", "End date"],
    ] as const) {
      if (!authorization[field]) {
        context.addIssue({
          code: "custom",
          message: `${label} is required.`,
          path: [field],
        });
      }
    }
    if (
      authorization.startDate &&
      authorization.endDate &&
      authorization.endDate < authorization.startDate
    ) {
      context.addIssue({
        code: "custom",
        message: "End date must be after the start date.",
        path: ["endDate"],
      });
    }
  });

const documentSchema = z.object({
  kind: z.enum(["profile_photo", "drivers_license", "work_authorization"]),
  fileName: requiredText("File name"),
  mimeType: z.string(),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  previewUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
});

export const onboardingSchema = z
  .object({
    name: personNameSchema,
    address: z.object({
      buildingOrApt: optionalText,
      street: requiredText("Street"),
      city: requiredText("City"),
      state: z.string().length(2, "Select a state."),
      zipCode: z
        .string()
        .trim()
        .regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid ZIP code."),
    }),
    contact: z.object({
      email: z.string().trim().email("Enter a valid email address."),
      cellPhone: phoneNumber,
      workPhone: optionalPhoneNumber,
    }),
    personalDetails: z.object({
      ssn: z
        .string()
        .trim()
        .regex(/^\d{3}-?\d{2}-?\d{4}$/, "Enter a valid SSN."),
      dateOfBirth: requiredText("Date of birth"),
      gender: z.enum(["male", "female", "decline"]).nullable().refine(Boolean, {
        message: "Select a gender option.",
      }),
    }),
    workAuthorization: workAuthorizationSchema,
    reference: referenceSchema,
    emergencyContacts: z
      .array(emergencyContactSchema)
      .min(1, "Add at least one emergency contact."),
    documents: z.array(documentSchema),
  })
  .superRefine((application, context) => {
    if (
      application.workAuthorization.isUsCitizenOrPermanentResident === false
    ) {
      if (
        !application.documents.some(
          (document) => document.kind === "work_authorization",
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Upload a work-authorization document.",
          path: ["documents"],
        });
      }
    }
  }) satisfies z.ZodType<OnboardingFormData>;
