import { z } from "zod";

export const uploadedFileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;
