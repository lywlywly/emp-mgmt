import { TRPCError } from "@trpc/server";
import {
  employeeListSchema,
  employeeProfileSchema,
  employeeSearchInputSchema,
  employeeSummarySchema,
  sendNotificationInputSchema,
  sendNotificationOutputSchema,
  userIdInputSchema,
  visaAllItemSchema,
  visaProgressItemSchema,
  visaSearchInputSchema,
} from "@emp-mgmt/shared";
import { router, hrProcedure } from "../trpc.js";
import {
  EmployeeProfileModel,
  type EmployeeProfile,
} from "../../models/EmployeeProfile.js";
import {
  OnboardingApplicationModel,
  type OnboardingApplication,
} from "../../models/OnboardingApplication.js";
import { OptWorkflowModel } from "../../models/OptWorkflow.js";
import { UserModel } from "../../models/User.js";
import { sendEmail } from "../../services/email.js";
import { presentEmployeeProfile } from "../presenters.js";

const OPT_VISA_TYPE = "f1";
const STEP_ORDER = ["optReceipt", "optEad", "i983", "i20"] as const;
type StepName = (typeof STEP_ORDER)[number];
const STEP_LABEL: Record<StepName, string> = {
  optReceipt: "OPT Receipt",
  optEad: "OPT EAD",
  i983: "I-983",
  i20: "I-20",
};

type PersonLike = (EmployeeProfile | OnboardingApplication) & {
  _id: unknown;
};

type StepState = { status: string; file: string | null };
type OptState = Record<StepName, StepState>;

// ---- Pure helpers (exported for offline unit testing) --------------------

// Whole days from now until endDate (negative if already past).
export function daysRemaining(endDate: Date): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

// Infer the next action given the application status and the OPT step states.
export function inferNextStep(appStatus: string | null, opt: OptState | null) {
  if (appStatus == null) {
    return {
      message: "Submit onboarding application",
      waitingOn: "employee" as const,
    };
  }
  if (appStatus === "pending") {
    return {
      message: "Waiting for HR to review the onboarding application",
      waitingOn: "hr" as const,
      step: "application" as const,
    };
  }
  if (appStatus === "rejected") {
    return {
      message:
        "Onboarding application was rejected — waiting for employee to resubmit",
      waitingOn: "employee" as const,
    };
  }
  // approved -> walk the OPT steps in order
  if (opt) {
    for (const s of STEP_ORDER) {
      const st = opt[s].status;
      if (st === "approved") continue;
      if (st === "pending") {
        return {
          message: `Waiting for HR to approve ${STEP_LABEL[s]}`,
          waitingOn: "hr" as const,
          step: s,
        };
      }
      if (st === "rejected") {
        return {
          message: `${STEP_LABEL[s]} was rejected — waiting for employee to re-upload`,
          waitingOn: "employee" as const,
          step: s,
        };
      }
      return {
        message: `Waiting for employee to upload ${STEP_LABEL[s]}`,
        waitingOn: "employee" as const,
        step: s,
      };
    }
  }
  return {
    message: "All OPT documents have been approved",
    waitingOn: "none" as const,
  };
}

// ---- Internal helpers ----------------------------------------------------

function fullName(p: PersonLike): string {
  const name = p.data?.name;
  return [name?.firstName, name?.middleName, name?.lastName]
    .filter(Boolean)
    .join(" ");
}

function workAuthTitle(p: PersonLike): string | null {
  const wa = p.data?.workAuthorization;
  if (wa?.type) {
    if (wa.type === "other") return wa.otherType || "Other";
    return (
      { h1b: "H1-B", l2: "L2", f1: "F1(CPT/OPT)", h4: "H4" }[wa.type] ?? wa.type
    );
  }
  if (wa?.residentOrCitizenType) return wa.residentOrCitizenType;
  return null;
}

function waView(p: PersonLike) {
  const wa = p.data?.workAuthorization;
  return {
    title: workAuthTitle(p),
    startDate: wa?.startDate?.toISOString() ?? null,
    endDate: wa?.endDate?.toISOString() ?? null,
  };
}

function daysRemainingOf(p: PersonLike): number | null {
  const end = p.data?.workAuthorization?.endDate;
  return end ? daysRemaining(end) : null;
}

// Effective OPT state; synthesizes the inherited Receipt state when no workflow
// document exists yet.
function optStateOf(wf: unknown, app: PersonLike): OptState {
  const receiptFile = app.data?.documents?.find(
    (document) => document.kind === "work_authorization",
  )?.file;
  if (!wf) {
    return {
      optReceipt: {
        status: receiptFile ? "pending" : "not_uploaded",
        file: receiptFile ? String(receiptFile) : null,
      },
      optEad: { status: "not_uploaded", file: null },
      i983: { status: "not_uploaded", file: null },
      i20: { status: "not_uploaded", file: null },
    };
  }
  const w = wf as Record<
    StepName,
    { status?: string; file?: unknown } | undefined
  >;
  const g = (s: StepName): StepState => ({
    status: w[s]?.status ?? "not_uploaded",
    file: w[s]?.file ? String(w[s]!.file) : null,
  });
  return {
    optReceipt: g("optReceipt"),
    optEad: g("optEad"),
    i983: g("i983"),
    i20: g("i20"),
  };
}

function toSummary(p: PersonLike) {
  return {
    userId: String(p.user),
    profileId: String(p._id),
    fullName: fullName(p),
    ssn: p.data?.personalDetails?.ssn ?? null,
    workAuthorization: workAuthTitle(p),
    phone: p.data?.contact?.cellPhone ?? null,
    email: p.data?.contact?.email ?? null,
  };
}

// Case-insensitive partial match on first/last/preferred name (empty -> match all).
function nameFilter(query?: string) {
  const q = query?.trim();
  if (!q) return {};
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return {
    $or: [
      { "data.name.firstName": rx },
      { "data.name.lastName": rx },
      { "data.name.preferredName": rx },
    ],
  };
}

async function workflowMap(userIds: unknown[]) {
  const wfs = await OptWorkflowModel.find({ user: { $in: userIds } }).lean();
  const map = new Map<string, unknown>();
  for (const wf of wfs) map.set(String(wf.user), wf);
  return map;
}

// ---- Router --------------------------------------------------------------

export const hrRouter = router({
  // Employee Profiles: summary list, sorted by last name, with a total count.
  listEmployees: hrProcedure.output(employeeListSchema).query(async () => {
    const profiles = await EmployeeProfileModel.find()
      .sort({ "data.name.lastName": 1 })
      .lean();
    return {
      total: profiles.length,
      employees: profiles.map(toSummary),
    };
  }),

  // Full profile of one employee.
  getEmployeeProfile: hrProcedure
    .input(userIdInputSchema)
    .output(employeeProfileSchema)
    .query(async ({ input }) => {
      const profile = await EmployeeProfileModel.findOne({
        user: input.userId,
      }).lean();
      if (!profile)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee profile not found",
        });
      return presentEmployeeProfile(profile);
    }),

  // Search employees by first / last / preferred name (0, 1, or many results).
  searchEmployees: hrProcedure
    .input(employeeSearchInputSchema)
    .output(employeeSummarySchema.array())
    .query(async ({ input }) => {
      const profiles = await EmployeeProfileModel.find(nameFilter(input.query))
        .sort({ "data.name.lastName": 1 })
        .lean();
      return profiles.map(toSummary);
    }),

  // Visa Status — In Progress: OPT (F1) employees not yet fully approved.
  visaInProgress: hrProcedure
    .output(visaProgressItemSchema.array())
    .query(async () => {
      const apps = await OnboardingApplicationModel.find({
        "data.workAuthorization.type": OPT_VISA_TYPE,
      }).lean();
      const wfMap = await workflowMap(apps.map((a) => a.user));

      const rows = [];
      for (const app of apps) {
        const wf = wfMap.get(String(app.user)) ?? null;
        const opt = optStateOf(wf, app);
        const next = inferNextStep(app.status ?? null, opt);
        if (next.waitingOn === "none") continue; // fully complete -> not "in progress"
        const step = ("step" in next ? next.step : null) ?? null;
        rows.push({
          userId: String(app.user),
          fullName: fullName(app),
          workAuthorization: waView(app),
          daysRemaining: daysRemainingOf(app),
          nextStep: next.message,
          waitingOn: next.waitingOn,
          step,
          // When waiting on HR for an OPT step, expose the document to preview.
          pendingFile:
            next.waitingOn === "hr" && step && step !== "application"
              ? opt[step].file
              : null,
          // When waiting on the employee, HR may nudge them.
          canNotify: next.waitingOn === "employee",
        });
      }
      return rows;
    }),

  // Visa Status — All: every OPT employee + their uploaded & approved documents.
  visaAll: hrProcedure
    .input(visaSearchInputSchema)
    .output(visaAllItemSchema.array())
    .query(async ({ input }) => {
      const apps = await OnboardingApplicationModel.find({
        "data.workAuthorization.type": OPT_VISA_TYPE,
        ...nameFilter(input.query),
      })
        .sort({ "data.name.lastName": 1 })
        .lean();
      const wfMap = await workflowMap(apps.map((a) => a.user));

      return apps.map((app) => {
        const wf = wfMap.get(String(app.user)) ?? null;
        const opt = optStateOf(wf, app);
        const approvedDocuments = STEP_ORDER.flatMap((step) => {
          const document = opt[step];
          return document.status === "approved" && document.file
            ? [{ step, label: STEP_LABEL[step], file: document.file }]
            : [];
        });
        return {
          userId: String(app.user),
          fullName: fullName(app),
          workAuthorization: waView(app),
          daysRemaining: daysRemainingOf(app),
          approvedDocuments,
        };
      });
    }),

  // Send a reminder email to one employee (console/smtp per EMAIL_MODE).
  sendNotification: hrProcedure
    .input(sendNotificationInputSchema)
    .output(sendNotificationOutputSchema)
    .mutation(async ({ input }) => {
      const user = await UserModel.findById(input.userId).lean();
      if (!user)
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const app = await OnboardingApplicationModel.findOne({
        user: input.userId,
      }).lean();
      const wf = await OptWorkflowModel.findOne({ user: input.userId }).lean();
      const next = inferNextStep(
        app?.status ?? null,
        app ? optStateOf(wf, app) : null,
      );

      const text = input.message?.trim()
        ? input.message
        : `Hello,\n\nThis is a reminder about your onboarding process.\nNext step: ${next.message}.\n`;

      await sendEmail({
        to: user.email,
        subject: "Action required on your onboarding",
        text,
      });
      return { ok: true, to: user.email, nextStep: next.message };
    }),
});
