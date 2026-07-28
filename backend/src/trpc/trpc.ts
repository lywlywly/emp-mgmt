import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;

// No login required (e.g. login, register, me).
export const publicProcedure = t.procedure;

// Requires an authenticated session; narrows ctx.userId to a non-null string.
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({ ctx: { userId: ctx.userId, role: ctx.role } });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Requires an authenticated HR session.
const isHr = t.middleware(({ ctx, next }) => {
  if (ctx.role !== "hr") {
    throw new TRPCError({ code: "FORBIDDEN", message: "HR access required" });
  }
  return next();
});

export const hrProcedure = protectedProcedure.use(isHr);
