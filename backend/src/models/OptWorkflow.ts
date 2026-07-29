import { Schema, model, InferSchemaType } from "mongoose";

// One document step; reused for all four OPT steps.
const optStepSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["not_uploaded", "pending", "approved", "rejected"],
      default: "not_uploaded",
    },
    feedback: String,
    file: { type: Schema.Types.ObjectId, ref: "FileMetadata" },
  },
  { _id: false },
);

// Steps in order: Receipt -> EAD -> I-983 -> I-20.
const optWorkflowSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    optReceipt: { type: optStepSchema, default: () => ({}) },
    optEad: { type: optStepSchema, default: () => ({}) },
    i983: { type: optStepSchema, default: () => ({}) },
    i20: { type: optStepSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export type OptWorkflow = InferSchemaType<typeof optWorkflowSchema>;
export const OptWorkflowModel = model("OptWorkflow", optWorkflowSchema);
