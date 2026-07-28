import { Schema, model, InferSchemaType } from "mongoose";
import { personalInfoFields } from "./shared";

const onboardingApplicationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // "never submitted" is represented by the document not existing (no extra status).
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    feedback: String, // HR feedback on rejection
    ...personalInfoFields,
  },
  { timestamps: true },
);

export type OnboardingApplication = InferSchemaType<typeof onboardingApplicationSchema>;
export const OnboardingApplicationModel = model(
  "OnboardingApplication",
  onboardingApplicationSchema,
);
