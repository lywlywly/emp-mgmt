import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { UserModel } from "../../models/User";
import { InvitationModel } from "../../models/Invitation";
import { hashPassword, verifyPassword } from "../../auth/password";

const registerInput = z.object({
  token: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email(),
});

const loginInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authRouter = router({
  // Consume an existing invitation token and create the employee account.
  register: publicProcedure.input(registerInput).mutation(async ({ input }) => {
    const invitation = await InvitationModel.findOne({ token: input.token });
    if (!invitation) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid registration token" });
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Registration token has expired" });
    }
    if (invitation.user) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Registration token has already been used" });
    }

    if (await UserModel.exists({ username: input.username })) {
      throw new TRPCError({ code: "CONFLICT", message: "Username already taken" });
    }
    if (await UserModel.exists({ email: input.email })) {
      throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
    }

    const user = await UserModel.create({
      username: input.username,
      email: input.email,
      password: await hashPassword(input.password),
      // role defaults to "employee"
    });

    // Link the invitation to the new account. Status stays "pending" until the
    // onboarding application is submitted (a later phase); the linked user also
    // acts as the single-use guard above.
    invitation.user = user._id;
    await invitation.save();

    return { id: String(user._id), username: user.username, role: user.role };
  }),

  // Verify credentials and store identity in the session.
  login: publicProcedure.input(loginInput).mutation(async ({ input, ctx }) => {
    const user = await UserModel.findOne({ username: input.username });
    if (!user || !(await verifyPassword(input.password, user.password))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
    }

    ctx.req.session.userId = String(user._id);
    ctx.req.session.role = user.role as "employee" | "hr";

    return { id: String(user._id), username: user.username, role: user.role };
  }),

  // Destroy the session.
  logout: publicProcedure.mutation(async ({ ctx }) => {
    await new Promise<void>((resolve, reject) => {
      ctx.req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    return { success: true };
  }),

  // Return the current user (for restoring login state after a page refresh),
  // or null if not logged in.
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) return null;
    const user = await UserModel.findById(ctx.userId);
    if (!user) return null;
    return { id: String(user._id), username: user.username, role: user.role };
  }),
});
