import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

// Surface the logged-in user's id/role from the session so auth middleware and
// procedures can read them. Populated by the `login` procedure.
export function createContext({ req, res }: CreateExpressContextOptions) {
  return {
    req,
    res,
    session: req.session,
    userId: req.session.userId,
    role: req.session.role,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
