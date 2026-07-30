import express from "express";
import session from "express-session";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { filesRouter } from "./routes/files.js";
import { errorHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();

  // Parse JSON bodies (for any plain Express routes). Harmless to tRPC — its
  // adapter reuses req.body — and to Multer, which only handles multipart.
  app.use(express.json());

  // express-session: HTTP-only cookie.
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // set to true behind HTTPS in production
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    }),
  );

  // File upload / download / preview (plain Express routes, not tRPC).
  app.use(filesRouter);

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
