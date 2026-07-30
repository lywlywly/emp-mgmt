import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, hrProcedure } from "../trpc";
import { EmployeeProfileModel } from "../../models/EmployeeProfile";
import { OnboardingApplicationModel } from "../../models/OnboardingApplication";
import { OptWorkflowModel } from "../../models/OptWorkflow";
import { UserModel } from "../../models/User";
import { sendEmail } from "../../services/email";

const OPT_VISA_TYPE = "F1(CPT/OPT)";
const STEP_ORDER = ["optReceipt", "optEad", "i983", "i20"] as const;
type StepName = (typeof STEP_ORDER)[number];
const STEP_LABEL: Record<StepName, string> = {
  optReceipt: "OPT Receipt",
  optEad: "OPT EAD",
  i983: "I-983",
  i20: "I-20",
};

// Loose structural view over lean documents (avoids Mongoose generic wrangling).
type PersonLike = {
  _id?: unknown;
  user?: unknown;
  status?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  preferredName?: string | null;
  ssn?: string | null;
  cellPhone?: string | null;
  email?: string | null;
  residencyType?: string | null;
  workAuthorization?: {
    type?: string | null;
    visaTitle?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
  } | null;
  documents?: { optReceipt?: unknown } | null;
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
    return { message: "Submit onboarding application", waitingOn: "employee" as const };
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
      message: "Onboarding application was rejected — waiting for employee to resubmit",
      waitingOn: "employee" as const,
    };
  }
  // approved -> walk the OPT steps in order
  if (opt) {
    for (const s of STEP_ORDER) {
      const st = opt[s].status;
      if (st === "approved") continue;
      if (st === "pending") {
        return { message: `Waiting for HR to approve ${STEP_LABEL[s]}`, waitingOn: "hr" as const, step: s };
      }
      if (st === "rejected") {
        return {
          message: `${STEP_LABEL[s]} was rejected — waiting for employee to re-upload`,
          waitingOn: "employee" as const,
          step: s,
        };
      }
      return { message: `Waiting for employee to upload ${STEP_LABEL[s]}`, waitingOn: "employee" as const, step: s };
    }
  }
  return { message: "All OPT documents have been approved", waitingOn: "none" as const };
}

// ---- Internal helpers ----------------------------------------------------

function fullName(p: PersonLike): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function workAuthTitle(p: PersonLike): string | null {
  const wa = p.workAuthorization;
  if (wa?.type) return wa.type === "Other" ? wa.visaTitle || "Other" : wa.type;
  if (p.residencyType) return p.residencyType;
  return null;
}

function waView(p: PersonLike) {
  const wa = p.workAuthorization;
  return { title: workAuthTitle(p), startDate: wa?.startDate ?? null, endDate: wa?.endDate ?? null };
}

function daysRemainingOf(p: PersonLike): number | null {
  const end = p.workAuthorization?.endDate;
  return end ? daysRemaining(end) : null;
}

// Effective OPT state; synthesizes the inherited-Receipt state when no workflow
// document exists yet (matches Phase 5's lazy creation).
function optStateOf(wf: unknown, app: PersonLike): OptState {
  const receiptFile = app.documents?.optReceipt ? String(app.documents.optReceipt) : null;
  if (!wf) {
    return {
      optReceipt: { status: receiptFile ? "pending" : "not_uploaded", file: receiptFile },
      optEad: { status: "not_uploaded", file: null },
      i983: { status: "not_uploaded", file: null },
      i20: { status: "not_uploaded", file: null },
    };
  }
  const w = wf as Record<StepName, { status?: string; file?: unknown } | undefined>;
  const g = (s: StepName): StepState => ({
    status: w[s]?.status ?? "not_uploaded",
    file: w[s]?.file ? String(w[s]!.file) : null,
  });
  return { optReceipt: g("optReceipt"), optEad: g("optEad"), i983: g("i983"), i20: g("i20") };
}

function toSummary(p: PersonLike) {
  return {
    userId: String(p.user),
    profileId: String(p._id),
    fullName: fullName(p),
    ssn: p.ssn ?? null,
    workAuthorization: workAuthTitle(p),
    phone: p.cellPhone ?? null,
    email: p.email ?? null,
  };
}

// Case-insensitive partial match on first/last/preferred name (empty -> match all).
function nameFilter(query?: string) {
  const q = query?.trim();
  if (!q) return {};
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return { $or: [{ firstName: rx }, { lastName: rx }, { preferredName: rx }] };
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
  listEmployees: hrProcedure.query(async () => {
    const profiles = await EmployeeProfileModel.find().sort({ lastName: 1 }).lean();
    return { total: profiles.length, employees: profiles.map(toSummary) };
  }),

  // Full profile of one employee.
  getEmployeeProfile: hrProcedure.input(z.object({ userId: z.string() })).query(async ({ input }) => {
    const profile = await EmployeeProfileModel.findOne({ user: input.userId }).lean();
    if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Employee profile not found" });
    return profile;
  }),

  // Search employees by first / last / preferred name (0, 1, or many results).
  searchEmployees: hrProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
    const profiles = await EmployeeProfileModel.find(nameFilter(input.query)).sort({ lastName: 1 }).lean();
    return profiles.map(toSummary);
  }),

  // Visa Status — In Progress: OPT (F1) employees not yet fully approved.
  visaInProgress: hrProcedure.query(async () => {
    const apps = (await OnboardingApplicationModel.find({
      "workAuthorization.type": OPT_VISA_TYPE,
    }).lean()) as PersonLike[];
    const wfMap = await workflowMap(apps.map((a) => a.user));

    const rows = [];
    for (const app of apps) {
      const wf = wfMap.get(String(app.user)) ?? null;
      const opt = optStateOf(wf, app);
      const next = inferNextStep(app.status ?? null, opt);
      if (next.waitingOn === "none") continue; // fully complete -> not "in progress"
      const step = "step" in next ? next.step : null;
      rows.push({
        userId: String(app.user),
        fullName: fullName(app),
        workAuthorization: waView(app),
        daysRemaining: daysRemainingOf(app),
        nextStep: next.message,
        waitingOn: next.waitingOn,
        step,
        // When waiting on HR for an OPT step, the doc to preview (Phase 4 endpoint).
        pendingFile: next.waitingOn === "hr" && step && step !== "application" ? opt[step].file : null,
        // When waiting on the employee, HR may nudge them.
        canNotify: next.waitingOn === "employee",
      });
    }
    return rows;
  }),

  // Visa Status — All: every OPT employee + their uploaded & approved documents.
  visaAll: hrProcedure.input(z.object({ query: z.string().optional() })).query(async ({ input }) => {
    const apps = (await OnboardingApplicationModel.find({
      "workAuthorization.type": OPT_VISA_TYPE,
      ...nameFilter(input.query),
    })
      .sort({ lastName: 1 })
      .lean()) as PersonLike[];
    const wfMap = await workflowMap(apps.map((a) => a.user));

    return apps.map((app) => {
      const wf = wfMap.get(String(app.user)) ?? null;
      const opt = optStateOf(wf, app);
      const approvedDocuments = STEP_ORDER.filter((s) => opt[s].status === "approved" && opt[s].file).map(
        (s) => ({ step: s, label: STEP_LABEL[s], file: opt[s].file }),
      );
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
    .input(z.object({ userId: z.string(), message: z.string().optional() }))
    .mutation(async ({ input }) => {
      const user = await UserModel.findById(input.userId).lean();
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const app = (await OnboardingApplicationModel.findOne({ user: input.userId }).lean()) as PersonLike | null;
      const wf = await OptWorkflowModel.findOne({ user: input.userId }).lean();
      const next = inferNextStep(app?.status ?? null, app ? optStateOf(wf, app) : null);

      const text = input.message?.trim()
        ? input.message
        : `Hello,\n\nThis is a reminder about your onboarding process.\nNext step: ${next.message}.\n`;

      await sendEmail({ to: user.email, subject: "Action required on your onboarding", text });
      return { ok: true, to: user.email, nextStep: next.message };
    }),
});
