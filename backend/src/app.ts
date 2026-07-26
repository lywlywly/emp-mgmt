import express from "express";
import session from "express-session";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";
import { uploadRouter } from "./routes/upload";
import { errorHandler } from "./middleware/error";

export function createApp() {
  const app = express();

  app.use(express.json());

  // express-session: HTTP-only cookie.
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
      resave: false,
      // Phase 0: set to true so `curl -i` immediately shows the HTTP-only
      // Set-Cookie, verifying the session pipeline; switch back to false
      // once auth is added.
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // set to true behind HTTPS in production
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    }),
  );

  // File upload pipeline (plain Express route, not tRPC).
  app.use(uploadRouter);

  // tRPC pipeline.
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Global error handler (mounted last).
  app.use(errorHandler);

  return app;
}
