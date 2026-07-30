import { InferSchemaType, model, Schema } from "mongoose";
import { employeeDataSchema } from "./valueObjects.js";

const onboardingApplicationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    feedback: { type: String, default: null },
    data: { type: employeeDataSchema, required: true },
  },
  { timestamps: true },
);

export type OnboardingApplication = InferSchemaType<
  typeof onboardingApplicationSchema
>;
export const OnboardingApplicationModel = model(
  "OnboardingApplication",
  onboardingApplicationSchema,
);
