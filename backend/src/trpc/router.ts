import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { authRouter } from "./routers/auth";
import { invitationRouter } from "./routers/invitation";

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
});

export type AppRouter = typeof appRouter;
