import { z } from "zod";
import { router, publicProcedure } from "./trpc";

export const appRouter = router({
  // Verifies the tRPC pipeline is wired up.
  hello: publicProcedure.query(() => "hello"),

  // Example: shows how a tRPC procedure validates input with Zod.
  greet: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(({ input }) => `hello, ${input.name}`),
});

export type AppRouter = typeof appRouter;
