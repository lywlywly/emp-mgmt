import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

import type {
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
};

// Change this index to preview a different role or workflow state.
export const activeMockSessionIndex = 0;

const mockSessions: MockSession[] = [
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "not_started",
    workAuthorization: null,
  },
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "pending",
    workAuthorization: "opt",
  },
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "rejected",
    workAuthorization: "other",
  },
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "other",
  },
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "opt",
  },
  {
    user: { name: "Alex Morgan", role: "hr" },
    onboardingStatus: "approved",
    workAuthorization: null,
  },
];

const REQUEST_DELAY_MS = 500;
const applications = new Map<number, OnboardingApplication>();

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

function getSession() {
  return mockSessions[activeMockSessionIndex];
}

function getApplication(): OnboardingApplication {
  const existingApplication = applications.get(activeMockSessionIndex);

  if (existingApplication) {
    return existingApplication;
  }

  const session = getSession();
  const application: OnboardingApplication = {
    id: `onboarding-${activeMockSessionIndex + 1}`,
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

  applications.set(activeMockSessionIndex, application);
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

  applications.set(activeMockSessionIndex, application);
  getSession().onboardingStatus = "pending";
  getSession().workAuthorization =
    data.workAuthorization.type === "f1" ? "opt" : "other";

  return structuredClone(application);
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
});

export type AppRouter = typeof mockAppRouter;
