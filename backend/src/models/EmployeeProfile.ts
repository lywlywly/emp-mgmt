import { InferSchemaType, model, Schema } from "mongoose";
import { employeeDataSchema } from "./valueObjects.js";

const employeeProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    data: { type: employeeDataSchema, required: true },
  },
  { timestamps: true },
);

export type EmployeeProfile = InferSchemaType<typeof employeeProfileSchema>;
export const EmployeeProfileModel = model(
  "EmployeeProfile",
  employeeProfileSchema,
);
