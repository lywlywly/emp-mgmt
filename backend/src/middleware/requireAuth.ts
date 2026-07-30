import type { RequestHandler } from "express";

// Express equivalent of tRPC's protectedProcedure: reject if not logged in.
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
};
