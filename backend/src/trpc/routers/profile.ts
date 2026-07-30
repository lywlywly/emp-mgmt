import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { assertOwnership, assertFilesOwnedBy } from "../authorize";
import { EmployeeProfileModel } from "../../models/EmployeeProfile";

// ---- Reusable field schemas ----------------------------------------------

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

// Employment section carries the residency conditional (same rule as onboarding).
const employmentUnion = z.discriminatedUnion("isPermanentResidentOrCitizen", [
  z.object({ isPermanentResidentOrCitizen: z.literal(true), residencyType: z.enum(["green_card", "citizen"]) }),
  z.object({ isPermanentResidentOrCitizen: z.literal(false), workAuthorization: workAuthorizationInput }),
]);

// Sections: Name (incl. SSN / DOB / gender / photo), Address, Contact,
// Employment, EmergencyContact. `email` is intentionally not in any section.
const updateSectionInput = z.discriminatedUnion("section", [
  z.object({
    section: z.literal("name"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    middleName: z.string().optional(),
    preferredName: z.string().optional(),
    profilePicture: z.string().optional(),
    ssn: z.string().min(1),
    dateOfBirth: z.coerce.date(),
    gender: z.enum(["male", "female", "no_answer"]),
  }),
  z.object({ section: z.literal("address"), address: addressInput }),
  z.object({
    section: z.literal("contact"),
    cellPhone: z.string().min(1),
    workPhone: z.string().optional(),
  }),
  z.object({ section: z.literal("employment"), employment: employmentUnion }),
  z.object({
    section: z.literal("emergencyContact"),
    emergencyContacts: z.array(contactPersonInput).min(1, "At least one emergency contact is required"),
  }),
]);

export const profileRouter = router({
  // Current user's profile (all sections + document refs), or null if none yet.
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const profile = await EmployeeProfileModel.findOne({ user: ctx.userId }).lean();
    if (!profile) return null;
    assertOwnership(ctx.userId, profile.user);
    return profile;
  }),

  // Update one section of the current user's profile. `email` is never changed.
  updateSection: protectedProcedure.input(updateSectionInput).mutation(async ({ ctx, input }) => {
    const profile = await EmployeeProfileModel.findOne({ user: ctx.userId });
    if (!profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No employee profile yet" });
    }
    assertOwnership(ctx.userId, profile.user);

    switch (input.section) {
      case "name":
        await assertFilesOwnedBy(ctx.userId, [input.profilePicture]);
        profile.set({
          firstName: input.firstName,
          lastName: input.lastName,
          middleName: input.middleName,
          preferredName: input.preferredName,
          profilePicture: input.profilePicture,
          ssn: input.ssn,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
        });
        break;
      case "address":
        profile.set("address", input.address);
        break;
      case "contact":
        profile.set({ cellPhone: input.cellPhone, workPhone: input.workPhone });
        break;
      case "employment": {
        const e = input.employment;
        profile.set("isPermanentResidentOrCitizen", e.isPermanentResidentOrCitizen);
        if (e.isPermanentResidentOrCitizen) {
          profile.set("residencyType", e.residencyType);
          profile.set("workAuthorization", undefined);
        } else {
          profile.set("workAuthorization", e.workAuthorization);
          profile.set("residencyType", undefined);
        }
        break;
      }
      case "emergencyContact":
        profile.set("emergencyContacts", input.emergencyContacts);
        break;
    }

    await profile.save();
    return profile.toObject();
  }),
});
