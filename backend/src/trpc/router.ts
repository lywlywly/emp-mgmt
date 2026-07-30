import { router } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { invitationRouter } from "./routers/invitation.js";
import { onboardingRouter } from "./routers/onboarding.js";
import { optRouter } from "./routers/opt.js";
import { profileRouter } from "./routers/profile.js";
import { hrRouter } from "./routers/hr.js";

export const appRouter = router({
  // Authentication & authorization.
  auth: authRouter,

  // HR invitation / registration tokens.
  invitation: invitationRouter,

  // Onboarding application: employee submit + HR review.
  onboarding: onboardingRouter,

  // OPT visa document workflow: employee upload + HR review.
  opt: optRouter,

  // Employee personal-information profile: view + section updates.
  profile: profileRouter,

  // HR employee profiles and visa-status management.
  hr: hrRouter,
});

export type AppRouter = typeof appRouter;
