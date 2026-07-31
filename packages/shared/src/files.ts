import { z } from "zod";

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_LABEL = "10 MB";

export const uploadedFileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z
    .number()
    .int()
    .nonnegative()
    .max(
      MAX_UPLOAD_SIZE_BYTES,
      `File must be ${MAX_UPLOAD_SIZE_LABEL} or smaller.`,
    ),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;
