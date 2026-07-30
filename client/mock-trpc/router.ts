import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

import type {
  HrOnboardingApplication,
  HrOnboardingApplicationSummary,
  HrOptEmployee,
  OptDocument,
  OptDocumentKind,
  OptDocumentSubmission,
  OptWorkflow,
  OnboardingApplication,
  OnboardingFormData,
  OnboardingStatus,
} from "../src/lib/onboarding.js";

type MockSession = {
  user: {
    name: string;
    role: "employee" | "hr";
  };
  onboardingStatus: OnboardingStatus;
  workAuthorization: "opt" | "other" | null;
  optScenario?: OptScenario;
};

type OptScenario =
  | "receipt_pending"
  | "ead_ready"
  | "i983_rejected"
  | "i20_pending"
  | "complete";

const mockSessions = {
  onboarding_not_started: {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "not_started",
    workAuthorization: null,
  },
  onboarding_pending: {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "pending",
    workAuthorization: "opt",
  },
  onboarding_rejected: {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "rejected",
    workAuthorization: "other",
  },
  employee_approved: {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "other",
  },
  opt_receipt_pending: {
    user: { name: "Priya Shah", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "opt",
    optScenario: "receipt_pending",
  },
  opt_ead_ready: {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "opt",
    optScenario: "ead_ready",
  },
  opt_i983_rejected: {
    user: { name: "Avery Chen", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "opt",
    optScenario: "i983_rejected",
  },
  opt_i20_pending: {
    user: { name: "Morgan Kim", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "opt",
    optScenario: "i20_pending",
  },
  opt_complete: {
    user: { name: "Taylor Reed", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "opt",
    optScenario: "complete",
  },
  hr: {
    user: { name: "Alex Morgan", role: "hr" },
    onboardingStatus: "approved",
    workAuthorization: null,
  },
} satisfies Record<string, MockSession>;

type MockSessionKey = keyof typeof mockSessions;
type MockOptWorkflow = Omit<OptWorkflow, "nextAction">;

// Change this key to preview a named role or workflow state.
export const activeMockSessionKey: MockSessionKey = "opt_complete";

const REQUEST_DELAY_MS = 500;
const applications = new Map<MockSessionKey, OnboardingApplication>();
const optWorkflows = new Map<MockSessionKey, MockOptWorkflow>();
const optEmployeeSessionKeys = [
  "opt_receipt_pending",
  "opt_ead_ready",
  "opt_i983_rejected",
  "opt_i20_pending",
  "opt_complete",
] as const satisfies readonly MockSessionKey[];

const optDocumentOrder: OptDocumentKind[] = [
  "opt_receipt",
  "opt_ead",
  "i_983",
  "i_20",
];

const optDocumentLabels: Record<OptDocumentKind, string> = {
  opt_receipt: "OPT Receipt",
  opt_ead: "OPT EAD",
  i_983: "I-983",
  i_20: "I-20",
};

const optDocumentKindSchema = z.enum([
  "opt_receipt",
  "opt_ead",
  "i_983",
  "i_20",
]);
const reviewDecisionSchema = z.enum(["approve", "reject"]);

const t = initTRPC.create();

function emptyFormData(email: string): OnboardingFormData {
  return {
    name: {
      firstName: "",
      middleName: "",
      lastName: "",
      preferredName: "",
    },
    address: {
      buildingOrApt: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
    contact: { email, cellPhone: "", workPhone: "" },
    personalDetails: { ssn: "", dateOfBirth: "", gender: null },
    workAuthorization: {
      isUsCitizenOrPermanentResident: null,
      residentOrCitizenType: null,
      type: null,
      otherType: "",
      startDate: "",
      endDate: "",
    },
    reference: {
      firstName: "",
      middleName: "",
      lastName: "",
      phone: "",
      email: "",
      relationship: "",
    },
    emergencyContacts: [],
    documents: [],
  };
}

function submittedFormData(email: string): OnboardingFormData {
  return {
    ...emptyFormData(email),
    name: {
      firstName: "Jordan",
      middleName: "Avery",
      lastName: "Lee",
      preferredName: "Jordan",
    },
    address: {
      buildingOrApt: "Apt 402",
      street: "100 Market Street",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
    },
    contact: {
      email,
      cellPhone: "415-555-0137",
      workPhone: "",
    },
    personalDetails: {
      ssn: "123-45-6789",
      dateOfBirth: "1997-04-12",
      gender: "decline",
    },
    workAuthorization: {
      isUsCitizenOrPermanentResident: false,
      residentOrCitizenType: null,
      type: "f1",
      otherType: "",
      startDate: "2026-08-01",
      endDate: "2027-07-31",
    },
    emergencyContacts: [
      {
        firstName: "Casey",
        middleName: "",
        lastName: "Lee",
        phone: "415-555-0182",
        email: "casey.lee@example.com",
        relationship: "Sibling",
      },
    ],
    documents: [
      {
        kind: "drivers_license",
        fileName: "jordan-lee-drivers-license.pdf",
        mimeType: "application/pdf",
        size: 102400,
      },
      {
        kind: "work_authorization",
        fileName: "jordan-lee-opt-receipt.pdf",
        mimeType: "application/pdf",
        size: 204800,
      },
    ],
  };
}

function createHrOnboardingApplication(
  id: string,
  employeeId: string,
  employeeName: string,
  status: OnboardingStatus,
  hrFeedback: string | null = null,
): HrOnboardingApplication {
  const [firstName, lastName] = employeeName.split(" ");
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
  const data = submittedFormData(email);

  data.name = {
    ...data.name,
    firstName,
    lastName,
    preferredName: firstName,
  };

  return {
    id,
    employeeId,
    employeeName,
    status,
    canEdit: status === "rejected",
    hrFeedback,
    submittedAt: "2026-07-01T17:00:00.000Z",
    data,
  };
}

const hrOnboardingApplications = new Map<string, HrOnboardingApplication>([
  [
    "onboarding-priya",
    createHrOnboardingApplication(
      "onboarding-priya",
      "employee-priya",
      "Priya Shah",
      "pending",
    ),
  ],
  [
    "onboarding-avery",
    createHrOnboardingApplication(
      "onboarding-avery",
      "employee-avery",
      "Avery Chen",
      "rejected",
      "Please upload a clearer work-authorization document.",
    ),
  ],
  [
    "onboarding-taylor",
    createHrOnboardingApplication(
      "onboarding-taylor",
      "employee-taylor",
      "Taylor Reed",
      "approved",
    ),
  ],
]);

function getSession(
  sessionKey: MockSessionKey = activeMockSessionKey,
): MockSession {
  return mockSessions[sessionKey];
}

function createOptDocuments(): OptDocument[] {
  return optDocumentOrder.map((kind) => ({
    kind,
    status: "not_started",
    feedback: null,
    file: null,
  }));
}

function setOptDocument(
  documents: OptDocument[],
  kind: OptDocumentKind,
  status: OptDocument["status"],
  file: OptDocument["file"] = null,
  feedback: string | null = null,
) {
  const document = documents.find((item) => item.kind === kind);
  if (!document) {
    throw new Error(`Missing OPT document: ${kind}`);
  }

  document.status = status;
  document.file = file;
  document.feedback = feedback;
}

function optFile(fileName: string): OptDocument["file"] {
  return { fileName, mimeType: "application/pdf", size: 102400 };
}

function uploadInstruction(kind: OptDocumentKind) {
  switch (kind) {
    case "opt_receipt":
      return "Please upload your OPT Receipt.";
    case "opt_ead":
      return "Please upload a copy of your OPT EAD.";
    case "i_983":
      return "Please download and fill out the I-983 form, then upload it.";
    case "i_20":
      return "Please send the approved I-983 and required documents to your school, then upload the new I-20.";
  }
}

function getNextOptAction(documents: OptDocument[]): OptWorkflow["nextAction"] {
  const pendingDocument = documents.find(
    (document) => document.status === "pending",
  );
  if (pendingDocument) {
    return {
      type: "wait_for_hr",
      document: pendingDocument.kind,
      message: `Waiting for HR to approve your ${optDocumentLabels[pendingDocument.kind]}.`,
    };
  }

  const rejectedDocument = documents.find(
    (document) => document.status === "rejected",
  );
  if (rejectedDocument) {
    return {
      type: "upload",
      document: rejectedDocument.kind,
      message: `Please upload a replacement ${optDocumentLabels[rejectedDocument.kind]}.`,
    };
  }

  const nextDocument = documents.find(
    (document) => document.status === "not_started",
  );
  if (nextDocument) {
    return {
      type: "upload",
      document: nextDocument.kind,
      message: uploadInstruction(nextDocument.kind),
    };
  }

  return {
    type: "complete",
    document: null,
    message: "All OPT documents have been approved.",
  };
}

function seedOptWorkflow(scenario: OptScenario): MockOptWorkflow {
  const documents = createOptDocuments();

  switch (scenario) {
    case "receipt_pending":
      setOptDocument(
        documents,
        "opt_receipt",
        "pending",
        optFile("jordan-lee-opt-receipt.pdf"),
      );
      break;
    case "ead_ready":
      setOptDocument(
        documents,
        "opt_receipt",
        "approved",
        optFile("jordan-lee-opt-receipt.pdf"),
      );
      break;
    case "i983_rejected":
      setOptDocument(
        documents,
        "opt_receipt",
        "approved",
        optFile("jordan-lee-opt-receipt.pdf"),
      );
      setOptDocument(
        documents,
        "opt_ead",
        "approved",
        optFile("jordan-lee-opt-ead.pdf"),
      );
      setOptDocument(
        documents,
        "i_983",
        "rejected",
        optFile("jordan-lee-i-983.pdf"),
        "Please complete the employer information before resubmitting the I-983.",
      );
      break;
    case "i20_pending":
      setOptDocument(
        documents,
        "opt_receipt",
        "approved",
        optFile("jordan-lee-opt-receipt.pdf"),
      );
      setOptDocument(
        documents,
        "opt_ead",
        "approved",
        optFile("jordan-lee-opt-ead.pdf"),
      );
      setOptDocument(
        documents,
        "i_983",
        "approved",
        optFile("jordan-lee-i-983.pdf"),
      );
      setOptDocument(
        documents,
        "i_20",
        "pending",
        optFile("jordan-lee-new-i-20.pdf"),
      );
      break;
    case "complete":
      for (const kind of optDocumentOrder) {
        setOptDocument(
          documents,
          kind,
          "approved",
          optFile(`jordan-lee-${kind}.pdf`),
        );
      }
      break;
  }

  return {
    applies: true,
    documents,
  };
}

function getOptWorkflow(
  sessionKey: MockSessionKey = activeMockSessionKey,
): MockOptWorkflow {
  const existingWorkflow = optWorkflows.get(sessionKey);
  if (existingWorkflow) return existingWorkflow;

  const session = getSession(sessionKey);
  const workflow =
    session.workAuthorization === "opt"
      ? seedOptWorkflow(session.optScenario ?? "receipt_pending")
      : {
          applies: false,
          documents: [],
        };

  optWorkflows.set(sessionKey, workflow);
  return workflow;
}

function toOptWorkflow(workflow: MockOptWorkflow): OptWorkflow {
  return {
    applies: workflow.applies,
    documents: structuredClone(workflow.documents),
    nextAction: workflow.applies
      ? getNextOptAction(workflow.documents)
      : {
          type: "complete",
          document: null,
          message: "OPT does not apply to this employee.",
        },
  };
}

function submitOptDocument(input: OptDocumentSubmission) {
  const workflow = getOptWorkflow();

  if (!workflow.applies) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "OPT does not apply to this employee.",
    });
  }

  const nextAction = getNextOptAction(workflow.documents);
  if (nextAction.type !== "upload" || nextAction.document !== input.kind) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This OPT document is not available to submit yet.",
    });
  }

  const document = workflow.documents.find((item) => item.kind === input.kind);
  if (!document) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
  }

  document.status = "pending";
  document.feedback = null;
  document.file = {
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
  };

  return toOptWorkflow(workflow);
}

function getApplication(): OnboardingApplication {
  const existingApplication = applications.get(activeMockSessionKey);

  if (existingApplication) {
    return existingApplication;
  }

  const session = getSession();
  const application: OnboardingApplication = {
    id: `onboarding-${activeMockSessionKey}`,
    status: session.onboardingStatus,
    canEdit:
      session.onboardingStatus === "not_started" ||
      session.onboardingStatus === "rejected",
    hrFeedback:
      session.onboardingStatus === "rejected"
        ? "Please confirm your work-authorization information and upload the required document."
        : null,
    submittedAt:
      session.onboardingStatus === "not_started"
        ? null
        : "2026-07-01T17:00:00.000Z",
    data:
      session.onboardingStatus === "pending"
        ? submittedFormData("jordan.lee@example.com")
        : emptyFormData("jordan.lee@example.com"),
  };

  applications.set(activeMockSessionKey, application);
  return application;
}

function saveApplication(data: OnboardingFormData) {
  const application: OnboardingApplication = {
    ...getApplication(),
    status: "pending",
    canEdit: false,
    hrFeedback: null,
    submittedAt: new Date().toISOString(),
    data: structuredClone(data),
  };

  applications.set(activeMockSessionKey, application);
  getSession().onboardingStatus = "pending";
  getSession().workAuthorization =
    data.workAuthorization.type === "f1" ? "opt" : "other";

  return structuredClone(application);
}

function listHrOnboardingApplications(): HrOnboardingApplicationSummary[] {
  return [...hrOnboardingApplications.values()].map((application) => ({
    id: application.id,
    employeeId: application.employeeId,
    employeeName: application.employeeName,
    status: application.status,
    submittedAt: application.submittedAt,
  }));
}

function getHrOnboardingApplication(id: string) {
  const application = hrOnboardingApplications.get(id);
  if (!application) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Onboarding application not found.",
    });
  }

  return application;
}

function reviewHrOnboardingApplication(input: {
  id: string;
  decision: "approve" | "reject";
  feedback?: string;
}) {
  const application = getHrOnboardingApplication(input.id);
  if (application.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only pending onboarding applications can be reviewed.",
    });
  }

  const feedback = input.feedback?.trim();
  if (input.decision === "reject" && !feedback) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Feedback is required when rejecting an application.",
    });
  }

  application.status = input.decision === "approve" ? "approved" : "rejected";
  application.canEdit = input.decision === "reject";
  application.hrFeedback = input.decision === "reject" ? feedback! : null;

  return structuredClone(application);
}

function isOptEmployeeSessionKey(
  sessionKey: string,
): sessionKey is (typeof optEmployeeSessionKeys)[number] {
  return optEmployeeSessionKeys.includes(
    sessionKey as (typeof optEmployeeSessionKeys)[number],
  );
}

function getHrOptEmployee(employeeId: string): HrOptEmployee {
  if (!isOptEmployeeSessionKey(employeeId)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "OPT employee not found.",
    });
  }

  const session = getSession(employeeId);
  return {
    employeeId,
    employeeName: session.user.name,
    workflow: toOptWorkflow(getOptWorkflow(employeeId)),
  };
}

function listHrOptEmployees(): HrOptEmployee[] {
  return optEmployeeSessionKeys.map((employeeId) =>
    getHrOptEmployee(employeeId),
  );
}

function reviewHrOptDocument(input: {
  employeeId: string;
  kind: OptDocumentKind;
  decision: "approve" | "reject";
  feedback?: string;
}) {
  if (!isOptEmployeeSessionKey(input.employeeId)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "OPT employee not found.",
    });
  }

  const workflow = getOptWorkflow(input.employeeId);
  const document = workflow.documents.find((item) => item.kind === input.kind);
  if (!document || document.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only pending OPT documents can be reviewed.",
    });
  }

  const feedback = input.feedback?.trim();
  if (input.decision === "reject" && !feedback) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Feedback is required when rejecting a document.",
    });
  }

  document.status = input.decision === "approve" ? "approved" : "rejected";
  document.feedback = input.decision === "reject" ? feedback! : null;

  return getHrOptEmployee(input.employeeId);
}

function sendOptReminder(employeeId: string) {
  const employee = getHrOptEmployee(employeeId);
  if (employee.workflow.nextAction.type !== "upload") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This employee does not have a document to upload yet.",
    });
  }

  return { employeeId, sentAt: new Date().toISOString() };
}

async function waitForRequest() {
  await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
}

export const mockAppRouter = t.router({
  auth: t.router({
    me: t.procedure.query(async () => {
      await waitForRequest();
      return structuredClone(getSession());
    }),
  }),
  onboarding: t.router({
    getMine: t.procedure.query(async () => {
      await waitForRequest();
      return structuredClone(getApplication());
    }),
    submit: t.procedure
      .input(z.custom<OnboardingFormData>())
      .mutation(async ({ input }) => {
        await waitForRequest();

        const { status } = getApplication();

        if (status !== "not_started" && status !== "rejected") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Only a new or rejected onboarding application can be submitted.",
          });
        }

        return saveApplication(input);
      }),
  }),
  opt: t.router({
    getMine: t.procedure.query(async () => {
      await waitForRequest();
      return toOptWorkflow(getOptWorkflow());
    }),
    submitDocument: t.procedure
      .input(
        z.object({
          kind: optDocumentKindSchema,
          fileName: z.string().min(1),
          mimeType: z.string(),
          size: z.number().int().positive(),
        }),
      )
      .mutation(async ({ input }) => {
        await waitForRequest();
        return submitOptDocument(input);
      }),
  }),
  hr: t.router({
    onboarding: t.router({
      list: t.procedure.query(async () => {
        await waitForRequest();
        return structuredClone(listHrOnboardingApplications());
      }),
      getById: t.procedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
          await waitForRequest();
          return structuredClone(getHrOnboardingApplication(input.id));
        }),
      review: t.procedure
        .input(
          z.object({
            id: z.string(),
            decision: reviewDecisionSchema,
            feedback: z.string().optional(),
          }),
        )
        .mutation(async ({ input }) => {
          await waitForRequest();
          return reviewHrOnboardingApplication(input);
        }),
    }),
    opt: t.router({
      list: t.procedure.query(async () => {
        await waitForRequest();
        return listHrOptEmployees();
      }),
      getByEmployeeId: t.procedure
        .input(z.object({ employeeId: z.string() }))
        .query(async ({ input }) => {
          await waitForRequest();
          return getHrOptEmployee(input.employeeId);
        }),
      reviewDocument: t.procedure
        .input(
          z.object({
            employeeId: z.string(),
            kind: optDocumentKindSchema,
            decision: reviewDecisionSchema,
            feedback: z.string().optional(),
          }),
        )
        .mutation(async ({ input }) => {
          await waitForRequest();
          return reviewHrOptDocument(input);
        }),
      sendNextStepReminder: t.procedure
        .input(z.object({ employeeId: z.string() }))
        .mutation(async ({ input }) => {
          await waitForRequest();
          return sendOptReminder(input.employeeId);
        }),
    }),
  }),
});

export type AppRouter = typeof mockAppRouter;
