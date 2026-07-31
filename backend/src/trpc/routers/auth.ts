import { TRPCError } from "@trpc/server";
import {
  authLoginInputSchema,
  authLogoutOutputSchema,
  authRegisterInputSchema,
  sessionUserSchema,
} from "@emp-mgmt/shared";
import { router, publicProcedure } from "../trpc.js";
import { UserModel } from "../../models/User.js";
import { InvitationModel } from "../../models/Invitation.js";
import { hashPassword, verifyPassword } from "../../auth/password.js";

export const authRouter = router({
  // Consume an existing invitation token and create the employee account.
  register: publicProcedure
    .input(authRegisterInputSchema)
    .output(sessionUserSchema)
    .mutation(async ({ input, ctx }) => {
      const invitation = await InvitationModel.findOne({ token: input.token });
      if (!invitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid registration token",
        });
      }
      if (invitation.expiresAt.getTime() <= Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration token has expired",
        });
      }
      if (invitation.user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration token has already been used",
        });
      }

      if (await UserModel.exists({ username: input.username })) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already taken",
        });
      }
      if (await UserModel.exists({ email: invitation.email })) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      const user = await UserModel.create({
        username: input.username,
        email: invitation.email,
        password: await hashPassword(input.password),
        // role defaults to "employee"
      });

      // Link the invitation to the new account. It becomes submitted only after
      // the employee submits onboarding.
      invitation.user = user._id;
      invitation.status = "registered";
      await invitation.save();

      ctx.req.session.userId = String(user._id);
      ctx.req.session.role = "employee";

      return { id: String(user._id), username: user.username, role: user.role };
    }),

  // Verify credentials and store identity in the session.
  login: publicProcedure
    .input(authLoginInputSchema)
    .output(sessionUserSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await UserModel.findOne({ username: input.username }).lean();
      if (!user || !(await verifyPassword(input.password, user.password))) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      ctx.req.session.userId = String(user._id);
      ctx.req.session.role = user.role as "employee" | "hr";

      return { id: String(user._id), username: user.username, role: user.role };
    }),

  // Destroy the session.
  logout: publicProcedure
    .output(authLogoutOutputSchema)
    .mutation(async ({ ctx }) => {
      await new Promise<void>((resolve, reject) => {
        ctx.req.session.destroy((err) => (err ? reject(err) : resolve()));
      });
      return { success: true };
    }),

  // Return the current user (for restoring login state after a page refresh),
  // or null if not logged in.
  me: publicProcedure
    .output(sessionUserSchema.nullable())
    .query(async ({ ctx }) => {
      if (!ctx.userId) return null;
      const user = await UserModel.findById(ctx.userId).lean();
      if (!user) return null;
      return { id: String(user._id), username: user.username, role: user.role };
    }),
});
