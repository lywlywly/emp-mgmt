import { z } from "zod";
import { uploadedFileSchema } from "./files.js";

export { uploadedFileSchema } from "./files.js";

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);
const optionalText = z.string().trim();
export const phoneNumberSchema = z
  .string()
  .regex(/^\d{3}-\d{3}-\d{4}$/, "Enter a valid U.S. phone number.");
export const optionalPhoneNumberSchema = z.union([
  z.literal(""),
  phoneNumberSchema,
]);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const personalDetailsSchema = z.object({
  ssn: z
    .string()
    .trim()
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, "Enter a valid SSN."),
  dateOfBirth: dateSchema,
  gender: z.enum(["male", "female", "decline"], {
    error: "Select a gender option.",
  }),
});

export const onboardingStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const onboardingStatusInputSchema = z.object({
  status: onboardingStatusSchema,
});

export const onboardingIdInputSchema = z.object({
  id: z.string().min(1),
});

export const onboardingListItemSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.email(),
  status: onboardingStatusSchema,
});

export const onboardingDocumentKindSchema = z.enum([
  "profile_photo",
  "drivers_license",
  "work_authorization",
]);

export const onboardingDocumentSchema = uploadedFileSchema.extend({
  kind: onboardingDocumentKindSchema,
});

export const personNameSchema = z.object({
  firstName: requiredText("First name"),
  middleName: optionalText,
  lastName: requiredText("Last name"),
  preferredName: optionalText,
});

export const addressSchema = z.object({
  buildingOrApt: optionalText,
  street: requiredText("Street"),
  city: requiredText("City"),
  state: z.string().length(2, "Select a state."),
  zipCode: z
    .string()
    .trim()
    .regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid ZIP code."),
});

const contactPersonFields = {
  firstName: requiredText("First name"),
  middleName: optionalText,
  lastName: requiredText("Last name"),
  phone: optionalPhoneNumberSchema,
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  relationship: requiredText("Relationship"),
};

export const emergencyContactSchema = z.object(contactPersonFields);

export const referenceContactSchema = z
  .object({
    firstName: optionalText,
    middleName: optionalText,
    lastName: optionalText,
    phone: optionalPhoneNumberSchema,
    email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
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

export const workAuthorizationSchema = z
  .discriminatedUnion(
    "isUsCitizenOrPermanentResident",
    [
      z.object({
        isUsCitizenOrPermanentResident: z.literal(true),
        residentOrCitizenType: z.enum(["green_card", "citizen"], {
          error: "Select Green Card or Citizen.",
        }),
        type: z.null(),
        otherType: z.literal(""),
        startDate: z.literal(""),
        endDate: z.literal(""),
      }),
      z.object({
        isUsCitizenOrPermanentResident: z.literal(false),
        residentOrCitizenType: z.null(),
        type: z.enum(["h1b", "l2", "f1", "h4", "other"], {
          error: "Select a work-authorization type.",
        }),
        otherType: optionalText,
        startDate: dateSchema,
        endDate: dateSchema,
      }),
    ],
    { error: "Select whether you are a U.S. citizen or permanent resident." },
  )
  .superRefine((authorization, context) => {
    if (authorization.isUsCitizenOrPermanentResident) return;

    if (authorization.type === "other" && !authorization.otherType) {
      context.addIssue({
        code: "custom",
        message: "Enter the visa title.",
        path: ["otherType"],
      });
    }
    if (authorization.endDate < authorization.startDate) {
      context.addIssue({
        code: "custom",
        message: "End date must be after start date.",
        path: ["endDate"],
      });
    }
  });

const onboardingSubmissionBaseSchema = z.object({
  name: personNameSchema,
  address: addressSchema,
  contact: z.object({
    cellPhone: phoneNumberSchema,
    workPhone: optionalPhoneNumberSchema,
  }),
  personalDetails: personalDetailsSchema,
  workAuthorization: workAuthorizationSchema,
  reference: referenceContactSchema.optional(),
  emergencyContacts: z
    .array(emergencyContactSchema)
    .min(1, "Add at least one emergency contact."),
  documents: z.array(onboardingDocumentSchema),
});

export function enforceWorkAuthorizationDocumentRule<
  T extends {
    documents: { kind: z.infer<typeof onboardingDocumentKindSchema> }[];
    workAuthorization: { isUsCitizenOrPermanentResident: boolean };
  },
>(application: T, context: z.RefinementCtx<T>) {
  if (
    application.workAuthorization.isUsCitizenOrPermanentResident === false &&
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

export const onboardingSubmitInputSchema =
  onboardingSubmissionBaseSchema.superRefine(
    enforceWorkAuthorizationDocumentRule,
  );

export const onboardingApplicationDataSchema = onboardingSubmissionBaseSchema
  .extend({
    contact: z.object({
      email: z.email(),
      cellPhone: phoneNumberSchema,
      workPhone: optionalPhoneNumberSchema,
    }),
    reference: referenceContactSchema.nullable(),
  })
  .superRefine(enforceWorkAuthorizationDocumentRule);

export const onboardingApplicationSchema = z.object({
  id: z.string(),
  status: onboardingStatusSchema,
  hrFeedback: z.string().nullable(),
  submittedAt: z.string().datetime().nullable(),
  data: onboardingApplicationDataSchema,
});

export const onboardingReviewInputSchema = z
  .object({
    id: z.string(),
    decision: z.enum(["approve", "reject"]),
    feedback: z.string().optional(),
  })
  .superRefine((review, context) => {
    if (review.decision === "reject" && !review.feedback?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Feedback is required when rejecting an application.",
        path: ["feedback"],
      });
    }
  });

export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type OnboardingListItem = z.infer<typeof onboardingListItemSchema>;
export type OnboardingDocumentKind = z.infer<
  typeof onboardingDocumentKindSchema
>;
export type { UploadedFile } from "./files.js";
export type OnboardingDocument = z.infer<typeof onboardingDocumentSchema>;
export type OnboardingSubmitInput = z.infer<typeof onboardingSubmitInputSchema>;
export type OnboardingApplicationData = z.infer<
  typeof onboardingApplicationDataSchema
>;
export type OnboardingApplication = z.infer<typeof onboardingApplicationSchema>;
export type OnboardingReviewInput = z.infer<typeof onboardingReviewInputSchema>;
