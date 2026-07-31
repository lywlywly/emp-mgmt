import { z } from "zod";
import {
  addressSchema,
  emergencyContactSchema,
  enforceWorkAuthorizationDocumentRule,
  onboardingDocumentSchema,
  optionalPhoneNumberSchema,
  personalDetailsSchema,
  phoneNumberSchema,
  personNameSchema,
  referenceContactSchema,
  workAuthorizationSchema,
} from "@emp-mgmt/shared";

import type { OnboardingFormData } from "@/lib/onboarding";

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

const documentSchema = onboardingDocumentSchema.partial({ id: true }).extend({
  fileName: requiredText("File name"),
  previewUrl: z.url().optional(),
  sourceUrl: z.url().optional(),
});

export const onboardingSchema = z
  .object({
    name: personNameSchema,
    address: addressSchema,
    contact: z.object({
      email: z.string().trim().pipe(z.email("Enter a valid email address.")),
      cellPhone: phoneNumberSchema,
      workPhone: optionalPhoneNumberSchema,
    }),
    personalDetails: personalDetailsSchema,
    workAuthorization: workAuthorizationSchema,
    reference: referenceContactSchema,
    emergencyContacts: z
      .array(emergencyContactSchema)
      .min(1, "Add at least one emergency contact."),
    documents: z.array(documentSchema),
  })
  .superRefine(
    enforceWorkAuthorizationDocumentRule,
  ) satisfies z.ZodType<OnboardingFormData>;
