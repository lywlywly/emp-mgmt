import { TRPCError } from "@trpc/server";

// Reusable ownership guard for later phases: throws FORBIDDEN unless the
// resource's owner matches the logged-in user. Accepts an ObjectId or string.
export function assertOwnership(
  userId: string,
  ownerId: { toString(): string } | string | null | undefined,
): void {
  if (!ownerId || String(ownerId) !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this resource",
    });
  }
}
