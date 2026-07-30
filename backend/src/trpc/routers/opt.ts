import type { HydratedDocument } from "mongoose";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, hrProcedure } from "../trpc";
import { assertOwnership } from "../authorize";
import { OptWorkflowModel, type OptWorkflow } from "../../models/OptWorkflow";
import { OnboardingApplicationModel } from "../../models/OnboardingApplication";
import { FileMetadataModel } from "../../models/FileMetadata";

type OptDoc = HydratedDocument<OptWorkflow>;

const STEP_ORDER = ["optReceipt", "optEad", "i983", "i20"] as const;
type StepName = (typeof STEP_ORDER)[number];

const OPT_VISA_TYPE = "F1(CPT/OPT)";

// Exact status messages (must match the product copy).
const MESSAGES: Record<StepName, { pending: string; approved: string }> = {
  optReceipt: {
    pending: "Waiting for HR to approve your OPT Receipt",
    approved: "Please upload a copy of your OPT EAD",
  },
  optEad: {
    pending: "Waiting for HR to approve your OPT EAD",
    approved: "Please download and fill out the I-983 form",
  },
  i983: {
    pending: "Waiting for HR to approve and sign your I-983",
    approved:
      "Please send the I-983 along with all necessary documents to your school and upload the new I-20",
  },
  i20: {
    pending: "Waiting for HR to approve your I-20",
    approved: "All documents have been approved",
  },
};

// I-983 downloadable static templates (served by files.ts).
const I983_TEMPLATES = { empty: "/templates/i983/empty", sample: "/templates/i983/sample" };

function stepMessage(name: StepName, status: string, feedback: string | null): string | null {
  if (status === "rejected") return feedback; // show HR feedback
  if (status === "pending" || status === "approved") return MESSAGES[name][status];
  return null; // not_uploaded — the previous step's "approved" message prompts the upload
}

function stepStatus(wf: OptDoc, name: StepName): string {
  return wf.get(`${name}.status`) as string;
}

// Sequential gate: every earlier step must be approved.
function previousApproved(wf: OptDoc, name: StepName): boolean {
  const idx = STEP_ORDER.indexOf(name);
  for (let i = 0; i < idx; i++) {
    if (stepStatus(wf, STEP_ORDER[i]) !== "approved") return false;
  }
  return true;
}

function viewStep(wf: OptDoc, name: StepName) {
  const status = stepStatus(wf, name);
  const feedback = (wf.get(`${name}.feedback`) as string | undefined) ?? null;
  const fileVal = wf.get(`${name}.file`);
  const base = {
    status,
    feedback,
    file: fileVal ? String(fileVal) : null,
    message: stepMessage(name, status, feedback),
  };
  return name === "i983" ? { ...base, templates: I983_TEMPLATES } : base;
}

function view(wf: OptDoc) {
  return {
    applicable: true as const,
    steps: {
      optReceipt: viewStep(wf, "optReceipt"),
      optEad: viewStep(wf, "optEad"),
      i983: viewStep(wf, "i983"),
      i20: viewStep(wf, "i20"),
    },
  };
}

// Eligible for OPT iff onboarding approved AND work authorization is F1(CPT/OPT).
async function getEligibility(userId: string) {
  const app = await OnboardingApplicationModel.findOne({ user: userId }).lean();
  const eligible =
    !!app && app.status === "approved" && app.workAuthorization?.type === OPT_VISA_TYPE;
  return { app, eligible };
}

// Create the workflow on first access. The Receipt is inherited from the
// onboarding application (pending, awaiting HR approval); the rest not_uploaded.
async function ensureWorkflow(userId: string, receiptFile: unknown): Promise<OptDoc> {
  const existing = await OptWorkflowModel.findOne({ user: userId });
  if (existing) return existing;
  return OptWorkflowModel.create({
    user: userId,
    optReceipt: receiptFile ? { status: "pending", file: receiptFile } : { status: "not_uploaded" },
  });
}

const reviewInput = z
  .object({
    userId: z.string(),
    step: z.enum(["optReceipt", "optEad", "i983", "i20"]),
    decision: z.enum(["approve", "reject"]),
    feedback: z.string().optional(),
  })
  .refine((v) => v.decision !== "reject" || (v.feedback?.trim().length ?? 0) > 0, {
    message: "Feedback is required when rejecting",
    path: ["feedback"],
  });

export const optRouter = router({
  // Employee: current OPT status, or { applicable: false } for non-OPT users.
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const { app, eligible } = await getEligibility(ctx.userId);
    if (!eligible || !app) return { applicable: false as const };
    const wf = await ensureWorkflow(ctx.userId, app.documents?.optReceipt);
    assertOwnership(ctx.userId, wf.user);
    return view(wf);
  }),

  // Employee: upload EAD / I-983 / I-20 (Receipt comes from the application, so
  // it is not uploadable here). File itself is uploaded first via POST /files.
  uploadNext: protectedProcedure
    .input(z.object({ step: z.enum(["optEad", "i983", "i20"]), fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { app, eligible } = await getEligibility(ctx.userId);
      if (!eligible || !app) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have an OPT workflow" });
      }
      const wf = await ensureWorkflow(ctx.userId, app.documents?.optReceipt);
      assertOwnership(ctx.userId, wf.user);

      // The referenced file must be one this user uploaded.
      const file = await FileMetadataModel.findById(input.fileId).lean();
      if (!file) throw new TRPCError({ code: "BAD_REQUEST", message: "File not found" });
      assertOwnership(ctx.userId, file.uploadedBy);

      if (!previousApproved(wf, input.step)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The previous OPT step must be approved first",
        });
      }
      const current = stepStatus(wf, input.step);
      if (current === "pending" || current === "approved") {
        throw new TRPCError({
          code: "CONFLICT",
          message: `This step is already "${current}" and cannot be uploaded again`,
        });
      }

      wf.set(`${input.step}.file`, input.fileId);
      wf.set(`${input.step}.status`, "pending");
      wf.set(`${input.step}.feedback`, undefined); // clear any prior rejection feedback
      await wf.save();

      return view(wf);
    }),

  // HR: approve/reject one step of one employee's OPT workflow.
  review: hrProcedure.input(reviewInput).mutation(async ({ input }) => {
    const { app, eligible } = await getEligibility(input.userId);
    if (!eligible || !app) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Target user has no OPT workflow" });
    }
    const wf = await ensureWorkflow(input.userId, app.documents?.optReceipt);

    if (stepStatus(wf, input.step) !== "pending") {
      throw new TRPCError({ code: "CONFLICT", message: "Only a pending step can be reviewed" });
    }
    if (!previousApproved(wf, input.step)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "The previous OPT step must be approved first",
      });
    }

    if (input.decision === "approve") {
      wf.set(`${input.step}.status`, "approved");
      wf.set(`${input.step}.feedback`, undefined);
    } else {
      wf.set(`${input.step}.status`, "rejected");
      wf.set(`${input.step}.feedback`, input.feedback);
    }
    await wf.save();

    return view(wf);
  }),
});
