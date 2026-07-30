import { Schema, model, InferSchemaType } from "mongoose";

const invitationSchema = new Schema(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    // Absolute expiry timestamp, checked when the invitation is used.
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "submitted"],
      default: "pending",
    },
    user: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type Invitation = InferSchemaType<typeof invitationSchema>;
export const InvitationModel = model("Invitation", invitationSchema);
