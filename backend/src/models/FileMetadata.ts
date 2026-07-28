import { Schema, model, InferSchemaType } from "mongoose";

const fileMetadataSchema = new Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export type FileMetadata = InferSchemaType<typeof fileMetadataSchema>;
export const FileMetadataModel = model("FileMetadata", fileMetadataSchema);
