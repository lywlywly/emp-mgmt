import type { ErrorRequestHandler } from "express";

// Global error-handling middleware (must be mounted last).
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[error]", err);
  const status = typeof err?.status === "number" ? err.status : 500;
  res.status(status).json({ error: err?.message ?? "Internal Server Error" });
};
