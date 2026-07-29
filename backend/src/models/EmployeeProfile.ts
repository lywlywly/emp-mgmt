import { Schema, model, InferSchemaType } from "mongoose";
import { personalInfoFields } from "./shared";

const employeeProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ...personalInfoFields,
  },
  { timestamps: true },
);

export type EmployeeProfile = InferSchemaType<typeof employeeProfileSchema>;
export const EmployeeProfileModel = model("EmployeeProfile", employeeProfileSchema);
