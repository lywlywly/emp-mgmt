import { TRPCError } from "@trpc/server";
import { FileMetadataModel } from "../models/FileMetadata";

// Reusable ownership guard: throws FORBIDDEN unless the resource's owner
// matches the logged-in user. Accepts an ObjectId or string.
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

// Ensure every referenced FileMetadata id exists and was uploaded by this user.
// Prevents attaching another user's file id (profilePicture / documents / etc.).
export async function assertFilesOwnedBy(
  userId: string,
  fileIds: (string | null | undefined)[],
): Promise<void> {
  const ids = [...new Set(fileIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return;

  const files = await FileMetadataModel.find({ _id: { $in: ids } }).select("uploadedBy").lean();
  if (files.length !== ids.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Referenced file not found" });
  }
  for (const file of files) {
    if (String(file.uploadedBy) !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Referenced file does not belong to you",
      });
    }
  }
}
