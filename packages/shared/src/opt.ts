import { z } from "zod";

export const optStepSchema = z.enum(["optReceipt", "optEad", "i983", "i20"]);
export const optUploadStepSchema = z.enum(["optEad", "i983", "i20"]);
export const optStepStatusSchema = z.enum([
  "not_uploaded",
  "pending",
  "approved",
  "rejected",
]);

export const optStepViewSchema = z.object({
  status: optStepStatusSchema,
  feedback: z.string().nullable(),
  file: z.string().nullable(),
  message: z.string().nullable(),
  templates: z
    .object({
      empty: z.string(),
      sample: z.string(),
    })
    .optional(),
});

export const optWorkflowSchema = z.discriminatedUnion("applicable", [
  z.object({ applicable: z.literal(false) }),
  z.object({
    applicable: z.literal(true),
    steps: z.object({
      optReceipt: optStepViewSchema,
      optEad: optStepViewSchema,
      i983: optStepViewSchema,
      i20: optStepViewSchema,
    }),
  }),
]);

export const optUploadNextInputSchema = z.object({
  step: optUploadStepSchema,
  fileId: z.string().min(1),
});

export const optReviewInputSchema = z
  .object({
    userId: z.string().min(1),
    step: optStepSchema,
    decision: z.enum(["approve", "reject"]),
    feedback: z.string().optional(),
  })
  .superRefine((review, context) => {
    if (review.decision === "reject" && !review.feedback?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Feedback is required when rejecting.",
        path: ["feedback"],
      });
    }
  });

export type OptStep = z.infer<typeof optStepSchema>;
export type OptUploadStep = z.infer<typeof optUploadStepSchema>;
export type OptStepStatus = z.infer<typeof optStepStatusSchema>;
export type OptStepView = z.infer<typeof optStepViewSchema>;
export type OptWorkflow = z.infer<typeof optWorkflowSchema>;
export type ApplicableOptWorkflow = Extract<OptWorkflow, { applicable: true }>;
export type OptUploadNextInput = z.infer<typeof optUploadNextInputSchema>;
export type OptReviewInput = z.infer<typeof optReviewInputSchema>;
