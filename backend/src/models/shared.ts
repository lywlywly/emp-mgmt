import { Schema } from "mongoose";

// Reusable address sub-schema (the whole block is required by its parent field).
export const addressSchema = new Schema(
  {
    building: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
  },
  { _id: false },
);

// Reusable contact person, shared by `reference` and each `emergencyContacts` item.
export const contactPersonSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: String,
    phone: String,
    email: String,
    relationship: { type: String, required: true },
  },
  { _id: false },
);

// Reusable work authorization (used when the person is NOT a PR/citizen).
export const workAuthorizationSchema = new Schema(
  {
    type: { type: String, enum: ["H1-B", "L2", "F1(CPT/OPT)", "H4", "Other"] },
    visaTitle: String, // filled when type is "Other"
    startDate: Date,
    endDate: Date,
  },
  { _id: false },
);

// Reusable onboarding documents (each is a ref to FileMetadata).
export const documentsSchema = new Schema(
  {
    driverLicense: { type: Schema.Types.ObjectId, ref: "FileMetadata" },
    workAuthorizationDoc: { type: Schema.Types.ObjectId, ref: "FileMetadata" },
    optReceipt: { type: Schema.Types.ObjectId, ref: "FileMetadata" },
  },
  { _id: false },
);

// Shared personal-info fields, spread into OnboardingApplication and EmployeeProfile.
export const personalInfoFields = {
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  middleName: String,
  preferredName: String,
  profilePicture: { type: Schema.Types.ObjectId, ref: "FileMetadata" },
  address: { type: addressSchema, required: true },
  cellPhone: { type: String, required: true },
  workPhone: String,
  email: { type: String, required: true },
  ssn: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  gender: { type: String, enum: ["male", "female", "no_answer"], required: true },
  isPermanentResidentOrCitizen: { type: Boolean },
  residencyType: { type: String, enum: ["green_card", "citizen"] },
  workAuthorization: { type: workAuthorizationSchema },
  reference: { type: contactPersonSchema, required: true },
  emergencyContacts: {
    type: [contactPersonSchema],
    validate: {
      validator: (v: unknown[]) => Array.isArray(v) && v.length >= 1,
      message: "At least one emergency contact is required",
    },
  },
  documents: { type: documentsSchema },
};
