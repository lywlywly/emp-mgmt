import { TRPCError } from "@trpc/server";
import {
  employeeProfileSchema,
  employeeProfileUpdateSectionInputSchema,
} from "@emp-mgmt/shared";
import { EmployeeProfileModel } from "../../models/EmployeeProfile.js";
import { assertFilesOwnedBy, assertOwnership } from "../authorize.js";
import { presentEmployeeProfile } from "../presenters.js";
import { protectedProcedure, router } from "../trpc.js";

export const profileRouter = router({
  getMine: protectedProcedure
    .output(employeeProfileSchema.nullable())
    .query(async ({ ctx }) => {
      const profile = await EmployeeProfileModel.findOne({
        user: ctx.userId,
      }).lean();
      if (!profile) return null;
      assertOwnership(ctx.userId, profile.user);
      return presentEmployeeProfile(profile);
    }),

  updateSection: protectedProcedure
    .input(employeeProfileUpdateSectionInputSchema)
    .output(employeeProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const profile = await EmployeeProfileModel.findOne({ user: ctx.userId });
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No employee profile yet",
        });
      }
      assertOwnership(ctx.userId, profile.user);

      switch (input.section) {
        case "name": {
          await assertFilesOwnedBy(ctx.userId, [input.profilePictureId]);
          profile.set("data.name", {
            firstName: input.firstName,
            lastName: input.lastName,
            middleName: input.middleName ?? "",
            preferredName: input.preferredName ?? "",
          });
          profile.set("data.personalDetails", {
            ssn: input.ssn,
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
          });
          if (input.profilePictureId) {
            const documents = profile.data.documents;
            profile.set("data.documents", [
              ...documents.filter(
                (document) => document.kind !== "profile_photo",
              ),
              { kind: "profile_photo", file: input.profilePictureId },
            ]);
          }
          break;
        }
        case "address":
          profile.set("data.address", input.address);
          break;
        case "contact":
          profile.set("data.contact.cellPhone", input.cellPhone);
          profile.set("data.contact.workPhone", input.workPhone);
          break;
        case "employment":
          profile.set("data.workAuthorization", input.workAuthorization);
          break;
        case "emergencyContact":
          profile.set("data.emergencyContacts", input.emergencyContacts);
          break;
      }

      await profile.save();
      return presentEmployeeProfile(profile.toObject());
    }),
});
