import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

// Phase 0: only expose req/res/session; no auth logic yet.
export function createContext({ req, res }: CreateExpressContextOptions) {
  return { req, res, session: req.session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
