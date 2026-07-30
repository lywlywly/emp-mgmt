import type { HydratedDocument } from "mongoose";
import { TRPCError } from "@trpc/server";
import {
  optStepStatusSchema,
  optReviewInputSchema,
  optUploadNextInputSchema,
  optWorkflowSchema,
  type ApplicableOptWorkflow,
  type OptStepStatus,
  type OptStepView,
} from "@emp-mgmt/shared";
import { router, protectedProcedure, hrProcedure } from "../trpc.js";
import { assertOwnership } from "../authorize.js";
import { OptWorkflowModel, type OptWorkflow } from "../../models/OptWorkflow.js";
import { OnboardingApplicationModel } from "../../models/OnboardingApplication.js";
import { FileMetadataModel } from "../../models/FileMetadata.js";
import type { EmployeeData } from "../../models/valueObjects.js";

type OptDoc = HydratedDocument<OptWorkflow>;

const STEP_ORDER = ["optReceipt", "optEad", "i983", "i20"] as const;
type StepName = (typeof STEP_ORDER)[number];

const OPT_VISA_TYPE = "f1";

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
const I983_TEMPLATES = {
  empty: "/templates/i983/empty",
  sample: "/templates/i983/sample",
};

function stepMessage(
  name: StepName,
  status: OptStepStatus,
  feedback: string | null,
): string | null {
  if (status === "rejected") return feedback; // show HR feedback
  if (status === "pending" || status === "approved")
    return MESSAGES[name][status];
  return null; // not_uploaded — the previous step's "approved" message prompts the upload
}

function stepStatus(wf: OptDoc, name: StepName): OptStepStatus {
  return optStepStatusSchema.parse(wf.get(`${name}.status`));
}

// Sequential gate: every earlier step must be approved.
function previousApproved(wf: OptDoc, name: StepName): boolean {
  const idx = STEP_ORDER.indexOf(name);
  for (let i = 0; i < idx; i++) {
    if (stepStatus(wf, STEP_ORDER[i]) !== "approved") return false;
  }
  return true;
}

function viewStep(wf: OptDoc, name: StepName): OptStepView {
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

function view(wf: OptDoc): ApplicableOptWorkflow {
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

function workAuthorizationDocument(data: EmployeeData) {
  return data.documents.find(
    (document) => document.kind === "work_authorization",
  )?.file;
}

// Eligible for OPT iff onboarding approved AND work authorization is F-1.
async function getEligibility(userId: string) {
  const app = await OnboardingApplicationModel.findOne({ user: userId }).lean();
  const eligible =
    !!app &&
    app.status === "approved" &&
    app.data.workAuthorization.type === OPT_VISA_TYPE;
  return { app, eligible };
}

// Create the workflow on first access. The Receipt is inherited from the
// onboarding application (pending, awaiting HR approval); the rest not_uploaded.
async function ensureWorkflow(
  userId: string,
  receiptFile: unknown,
): Promise<OptDoc> {
  const existing = await OptWorkflowModel.findOne({ user: userId });
  if (existing) return existing;
  return OptWorkflowModel.create({
    user: userId,
    optReceipt: receiptFile
      ? { status: "pending", file: receiptFile }
      : { status: "not_uploaded" },
  });
}

export const optRouter = router({
  // Employee: current OPT status, or { applicable: false } for non-OPT users.
  getMine: protectedProcedure
    .output(optWorkflowSchema)
    .query(async ({ ctx }) => {
      const { app, eligible } = await getEligibility(ctx.userId);
      if (!eligible || !app) return { applicable: false as const };
      const wf = await ensureWorkflow(
        ctx.userId,
        workAuthorizationDocument(app.data),
      );
      assertOwnership(ctx.userId, wf.user);
      return view(wf);
    }),

  // Employee: upload EAD / I-983 / I-20 (Receipt comes from the application, so
  // it is not uploadable here). File itself is uploaded first via POST /files.
  uploadNext: protectedProcedure
    .input(optUploadNextInputSchema)
    .output(optWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const { app, eligible } = await getEligibility(ctx.userId);
      if (!eligible || !app) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have an OPT workflow",
        });
      }
      const wf = await ensureWorkflow(
        ctx.userId,
        workAuthorizationDocument(app.data),
      );
      assertOwnership(ctx.userId, wf.user);

      // The referenced file must be one this user uploaded.
      const file = await FileMetadataModel.findById(input.fileId).lean();
      if (!file)
        throw new TRPCError({ code: "BAD_REQUEST", message: "File not found" });
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
  review: hrProcedure
    .input(optReviewInputSchema)
    .output(optWorkflowSchema)
    .mutation(async ({ input }) => {
      const { app, eligible } = await getEligibility(input.userId);
      if (!eligible || !app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target user has no OPT workflow",
        });
      }
      const wf = await ensureWorkflow(
        input.userId,
        workAuthorizationDocument(app.data),
      );

      if (stepStatus(wf, input.step) !== "pending") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Only a pending step can be reviewed",
        });
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
