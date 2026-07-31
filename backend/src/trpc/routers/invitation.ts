import crypto from "node:crypto";
import {
  invitationGenerateInputSchema,
  invitationGenerateOutputSchema,
  invitationListItemSchema,
} from "@emp-mgmt/shared";
import { router, hrProcedure } from "../trpc.js";
import { InvitationModel } from "../../models/Invitation.js";
import { sendEmail } from "../../services/email.js";

const TOKEN_TTL_MS = 3 * 60 * 60 * 1000; // token is valid for 3 hours

function invitationStatus(invitation: {
  status: "pending" | "registered" | "submitted" | "expired";
  expiresAt: Date;
}) {
  return invitation.status === "pending" && invitation.expiresAt <= new Date()
    ? "expired"
    : invitation.status;
}

function registrationLink(token: string): string {
  const base = process.env.FRONTEND_URL ?? "http://localhost:5173";
  return `${base}/register?token=${token}`;
}

export const invitationRouter = router({
  // HR generates a unique token, stores an Invitation, and emails the link.
  generateAndSend: hrProcedure
    .input(invitationGenerateInputSchema)
    .output(invitationGenerateOutputSchema)
    .mutation(async ({ input }) => {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      const invitation = await InvitationModel.create({
        email: input.email,
        name: input.name,
        token,
        expiresAt,
        // status defaults to "pending"
      });

      const link = registrationLink(token);
      await sendEmail({
        to: input.email,
        subject: "Your registration link",
        text:
          `Hello ${input.name},\n\n` +
          `You have been invited to register. Use the link below to complete ` +
          `your registration (valid for 3 hours):\n\n${link}\n`,
      });

      return {
        id: String(invitation._id),
        email: invitation.email,
        name: input.name,
        token,
        link,
        expiresAt: expiresAt.toISOString(),
      };
    }),

  // HR views the history of invitations, newest first.
  list: hrProcedure.output(invitationListItemSchema.array()).query(async () => {
    const invitations = await InvitationModel.find()
      .sort({ createdAt: -1 })
      .lean();
    return invitations.map((inv) => ({
      id: String(inv._id),
      email: inv.email,
      name: inv.name ?? "",
      link: registrationLink(inv.token),
      status: invitationStatus(inv),
    }));
  }),
});
