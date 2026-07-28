import { Schema, model, InferSchemaType } from "mongoose";

const invitationSchema = new Schema(
  {
    email: { type: String, required: true },
    name: String,
    token: { type: String, required: true, unique: true },
    // Absolute expiry timestamp; the "valid for 3 hours" rule is enforced later.
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "submitted"], default: "pending" },
    user: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type Invitation = InferSchemaType<typeof invitationSchema>;
export const InvitationModel = model("Invitation", invitationSchema);
