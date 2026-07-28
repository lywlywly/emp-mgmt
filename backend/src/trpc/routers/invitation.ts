import { z } from "zod";
import crypto from "node:crypto";
import { router, hrProcedure } from "../trpc";
import { InvitationModel } from "../../models/Invitation";
import { sendEmail } from "../../services/email";

const TOKEN_TTL_MS = 3 * 60 * 60 * 1000; // token is valid for 3 hours

function registrationLink(token: string): string {
  const base = process.env.FRONTEND_URL ?? "http://localhost:5173";
  return `${base}/register?token=${token}`;
}

const generateInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export const invitationRouter = router({
  // HR generates a unique token, stores an Invitation, and emails the link.
  generateAndSend: hrProcedure.input(generateInput).mutation(async ({ input }) => {
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
      name: invitation.name,
      token,
      link,
      expiresAt,
    };
  }),

  // HR views the history of invitations, newest first.
  list: hrProcedure.query(async () => {
    const invitations = await InvitationModel.find().sort({ createdAt: -1 });
    return invitations.map((inv) => ({
      id: String(inv._id),
      email: inv.email,
      name: inv.name,
      link: registrationLink(inv.token),
      status: inv.status, // "pending" | "submitted" — whether onboarding was submitted
    }));
  }),
});
