import { TRPCError } from "@trpc/server";
import {
  onboardingApplicationSchema,
  onboardingApplicationDataSchema,
  onboardingIdInputSchema,
  onboardingListItemSchema,
  onboardingReviewInputSchema,
  onboardingStatusInputSchema,
  onboardingSubmitInputSchema,
  type OnboardingApplication,
  type OnboardingSubmitInput,
} from "@emp-mgmt/shared";

import { InvitationModel } from "../../models/Invitation.js";
import { OnboardingApplicationModel } from "../../models/OnboardingApplication.js";
import { EmployeeProfileModel } from "../../models/EmployeeProfile.js";
import { UserModel } from "../../models/User.js";
import type { EmployeeData } from "../../models/valueObjects.js";
import { assertFilesOwnedBy } from "../authorize.js";
import { presentEmployeeData } from "../presenters.js";
import { hrProcedure, protectedProcedure, router } from "../trpc.js";

type StoredApplication = {
  _id: unknown;
  user: unknown;
  status: string;
  feedback?: string | null;
  createdAt?: Date;
  data: EmployeeData;
};

function presentReference(reference: OnboardingSubmitInput["reference"]) {
  return reference && Object.values(reference).some(Boolean) ? reference : null;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

async function toApplication(
  application: StoredApplication,
): Promise<OnboardingApplication> {
  return onboardingApplicationSchema.parse({
    id: String(application._id),
    status: application.status,
    hrFeedback: application.feedback ?? null,
    submittedAt: application.createdAt?.toISOString() ?? null,
    data: await presentEmployeeData(application.data),
  });
}

export const onboardingRouter = router({
  getMine: protectedProcedure
    .output(onboardingApplicationSchema.nullable())
    .query(async ({ ctx }) => {
      const application = await OnboardingApplicationModel.findOne({
        user: ctx.userId,
      }).lean();
      return application ? toApplication(application) : null;
    }),

  submit: protectedProcedure
    .input(onboardingSubmitInputSchema)
    .output(onboardingApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await OnboardingApplicationModel.findOne({
        user: ctx.userId,
      }).lean();
      if (existing && existing.status !== "rejected") {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Your application is "${existing.status}" and can no longer be edited.`,
        });
      }

      const user = await UserModel.findById(ctx.userId).lean();
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found.",
        });
      }

      const submittedData = onboardingApplicationDataSchema.parse({
        ...input,
        contact: { ...input.contact, email: user.email },
        reference: presentReference(input.reference),
      });

      if (existing?.status === "rejected") {
        const previousData = (await toApplication(existing)).data;
        if (stableJson(previousData) === stableJson(submittedData)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Update the application before resubmitting it.",
          });
        }
      }

      await assertFilesOwnedBy(
        ctx.userId,
        input.documents.map((document) => document.id),
      );

      const data = {
        ...submittedData,
        documents: submittedData.documents.map(({ id, kind }) => ({
          kind,
          file: id,
        })),
      };

      await OnboardingApplicationModel.deleteOne({ user: ctx.userId });
      const application = await OnboardingApplicationModel.create({
        user: ctx.userId,
        status: "pending",
        feedback: null,
        data,
      });

      await InvitationModel.updateOne(
        { user: ctx.userId },
        { status: "submitted" },
      );
      return toApplication(application.toObject());
    }),

  listByStatus: hrProcedure
    .input(onboardingStatusInputSchema)
    .output(onboardingListItemSchema.array())
    .query(async ({ input }) => {
      const applications = await OnboardingApplicationModel.find({
        status: input.status,
      })
        .sort({ updatedAt: -1 })
        .lean();
      return applications.map((application) => ({
        id: String(application._id),
        fullName: [
          application.data.name.firstName,
          application.data.name.lastName,
        ]
          .filter(Boolean)
          .join(" "),
        email: application.data.contact.email,
        status: application.status,
      }));
    }),

  getById: hrProcedure
    .input(onboardingIdInputSchema)
    .output(onboardingApplicationSchema)
    .query(async ({ input }) => {
      const application = await OnboardingApplicationModel.findById(
        input.id,
      ).lean();
      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Onboarding application not found.",
        });
      }
      return toApplication(application);
    }),

  review: hrProcedure
    .input(onboardingReviewInputSchema)
    .output(onboardingApplicationSchema)
    .mutation(async ({ input }) => {
      const application = await OnboardingApplicationModel.findById(input.id);
      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Onboarding application not found.",
        });
      }
      if (application.status !== "pending") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Only pending onboarding applications can be reviewed.",
        });
      }

      application.status =
        input.decision === "approve" ? "approved" : "rejected";
      application.feedback =
        input.decision === "reject" ? input.feedback!.trim() : null;
      await application.save();

      const stored = application.toObject();
      if (input.decision === "approve") {
        await EmployeeProfileModel.deleteOne({ user: application.user });
        await EmployeeProfileModel.create({
          user: application.user,
          data: stored.data,
        });
      }

      return toApplication(stored);
    }),
});
