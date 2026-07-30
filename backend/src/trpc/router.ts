import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { authRouter } from "./routers/auth";
import { invitationRouter } from "./routers/invitation";
import { onboardingRouter } from "./routers/onboarding";
import { optRouter } from "./routers/opt";
import { profileRouter } from "./routers/profile";
import { hrRouter } from "./routers/hr";

export const appRouter = router({
  // Verifies the tRPC pipeline is wired up.
  hello: publicProcedure.query(() => "hello"),

  // Example: shows how a tRPC procedure validates input with Zod.
  greet: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(({ input }) => `hello, ${input.name}`),

  // Authentication & authorization (Phase 2).
  auth: authRouter,

  // HR invitation / registration tokens (Phase 3).
  invitation: invitationRouter,

  // Onboarding application: employee submit + HR review (Phase 4).
  onboarding: onboardingRouter,

  // OPT visa document workflow: employee upload + HR review (Phase 5).
  opt: optRouter,

  // Employee personal-info profile: view + section updates (Phase 6).
  profile: profileRouter,

  // HR: employee profiles + visa status management (Phase 6).
  hr: hrRouter,
});

export type AppRouter = typeof appRouter;
