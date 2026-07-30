import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, hrProcedure } from "../trpc";
import { assertFilesOwnedBy } from "../authorize";
import { OnboardingApplicationModel } from "../../models/OnboardingApplication";
import { EmployeeProfileModel } from "../../models/EmployeeProfile";
import { UserModel } from "../../models/User";
import { InvitationModel } from "../../models/Invitation";
import { pickPersonalInfo } from "../../models/shared";

// ---- Input schemas -------------------------------------------------------

const addressInput = z.object({
  building: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
});

const contactPersonInput = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  relationship: z.string().min(1),
});

// File references are FileMetadata ids (strings); Mongoose casts them to ObjectId.
const documentsInput = z
  .object({
    driverLicense: z.string().optional(),
    workAuthorizationDoc: z.string().optional(),
    optReceipt: z.string().optional(),
  })
  .optional();

// Fields common to both residency branches. `email` is intentionally absent:
// it is forced server-side from the account, never taken from the client.
const commonFields = {
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  preferredName: z.string().optional(),
  profilePicture: z.string().optional(),
  address: addressInput,
  cellPhone: z.string().min(1),
  workPhone: z.string().optional(),
  ssn: z.string().min(1),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["male", "female", "no_answer"]),
  reference: contactPersonInput,
  emergencyContacts: z
    .array(contactPersonInput)
    .min(1, "At least one emergency contact is required"),
  documents: documentsInput,
};

const workAuthorizationInput = z
  .object({
    type: z.enum(["H1-B", "L2", "F1(CPT/OPT)", "H4", "Other"]),
    visaTitle: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((w) => w.type !== "Other" || (w.visaTitle?.trim().length ?? 0) > 0, {
    message: "visaTitle is required when work authorization type is Other",
    path: ["visaTitle"],
  });

// Conditional cross-field rules via a discriminated union on residency status.
export const submitInput = z.discriminatedUnion("isPermanentResidentOrCitizen", [
  z.object({
    ...commonFields,
    isPermanentResidentOrCitizen: z.literal(true),
    residencyType: z.enum(["green_card", "citizen"]),
  }),
  z.object({
    ...commonFields,
    isPermanentResidentOrCitizen: z.literal(false),
    workAuthorization: workAuthorizationInput,
  }),
]);

export const reviewInput = z
  .object({
    id: z.string(),
    decision: z.enum(["approve", "reject"]),
    feedback: z.string().optional(),
  })
  .refine((v) => v.decision !== "reject" || (v.feedback?.trim().length ?? 0) > 0, {
    message: "Feedback is required when rejecting",
    path: ["feedback"],
  });

// ---- Router --------------------------------------------------------------

export const onboardingRouter = router({
  // Current user's application, or null if never submitted.
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const app = await OnboardingApplicationModel.findOne({ user: ctx.userId }).lean();
    return app ?? null;
  }),

  // First submission or resubmission after a rejection. Blocked while the
  // application is pending or approved.
  submit: protectedProcedure.input(submitInput).mutation(async ({ ctx, input }) => {
    const existing = await OnboardingApplicationModel.findOne({ user: ctx.userId }).lean();
    if (existing && existing.status !== "rejected") {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Your application is "${existing.status}" and can no longer be edited`,
      });
    }

    const user = await UserModel.findById(ctx.userId).lean();
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    // Referenced files must belong to this user (no attaching others' file ids).
    await assertFilesOwnedBy(ctx.userId, [
      input.profilePicture,
      input.documents?.driverLicense,
      input.documents?.workAuthorizationDoc,
      input.documents?.optReceipt,
    ]);

    // Replace any prior (rejected) application so no stale fields linger.
    await OnboardingApplicationModel.deleteOne({ user: ctx.userId });
    const app = await OnboardingApplicationModel.create({
      ...input,
      user: ctx.userId,
      email: user.email, // server-forced; client-supplied email is ignored
      status: "pending",
    });

    // The invitation becomes "submitted" once the application is submitted.
    await InvitationModel.updateOne({ user: ctx.userId }, { status: "submitted" });

    return app.toObject();
  }),

  // HR: list applications in one status (the three review sections).
  listByStatus: hrProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected"]) }))
    .query(async ({ input }) => {
      const apps = await OnboardingApplicationModel.find({ status: input.status })
        .sort({ updatedAt: -1 })
        .lean();
      return apps.map((a) => ({
        id: String(a._id),
        fullName: [a.firstName, a.lastName].filter(Boolean).join(" "),
        email: a.email,
        status: a.status,
      }));
    }),

  // HR: view one full application.
  getById: hrProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const app = await OnboardingApplicationModel.findById(input.id).lean();
    if (!app) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
    }
    return app;
  }),

  // HR: approve or reject a pending application (reject requires feedback).
  review: hrProcedure.input(reviewInput).mutation(async ({ input }) => {
    const app = await OnboardingApplicationModel.findById(input.id);
    if (!app) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
    }
    if (app.status !== "pending") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Only pending applications can be reviewed",
      });
    }

    if (input.decision === "approve") {
      app.status = "approved";
      app.feedback = undefined;
    } else {
      app.status = "rejected";
      app.feedback = input.feedback;
    }
    await app.save();

    // On approval, materialize the EmployeeProfile from the approved application
    // (email carries over unchanged from the application).
    if (input.decision === "approve") {
      const src = app.toObject();
      await EmployeeProfileModel.deleteOne({ user: app.user });
      await EmployeeProfileModel.create({ user: app.user, ...pickPersonalInfo(src) });
    }

    return app.toObject();
  }),
});
