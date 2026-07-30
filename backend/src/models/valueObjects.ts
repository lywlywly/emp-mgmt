import { InferSchemaType, Schema } from "mongoose";

export const nameSchema = new Schema(
  {
    firstName: { type: String, required: true },
    middleName: { type: String, default: "" },
    lastName: { type: String, required: true },
    preferredName: { type: String, default: "" },
  },
  { _id: false },
);

export const addressSchema = new Schema(
  {
    buildingOrApt: { type: String, default: "" },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
  },
  { _id: false },
);

export const contactSchema = new Schema(
  {
    email: { type: String, required: true },
    cellPhone: { type: String, required: true },
    workPhone: { type: String, default: "" },
  },
  { _id: false },
);

export const personalDetailsSchema = new Schema(
  {
    ssn: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "decline"],
      required: true,
    },
  },
  { _id: false },
);

export const contactPersonSchema = new Schema(
  {
    firstName: { type: String, required: true },
    middleName: { type: String, default: "" },
    lastName: { type: String, required: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    relationship: { type: String, required: true },
  },
  { _id: false },
);

export const workAuthorizationSchema = new Schema(
  {
    isUsCitizenOrPermanentResident: { type: Boolean, required: true },
    residentOrCitizenType: {
      type: String,
      enum: ["green_card", "citizen"],
      default: null,
    },
    type: {
      type: String,
      enum: ["h1b", "l2", "f1", "h4", "other"],
      default: null,
    },
    otherType: { type: String, default: "" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { _id: false },
);

export const documentSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["profile_photo", "drivers_license", "work_authorization"],
      required: true,
    },
    file: { type: Schema.Types.ObjectId, ref: "FileMetadata", required: true },
  },
  { _id: false },
);

export const emergencyContactsValidator = {
  validator: (value: unknown[]) => Array.isArray(value) && value.length >= 1,
  message: "At least one emergency contact is required",
};

export const employeeDataSchema = new Schema(
  {
    name: { type: nameSchema, required: true },
    address: { type: addressSchema, required: true },
    contact: { type: contactSchema, required: true },
    personalDetails: { type: personalDetailsSchema, required: true },
    workAuthorization: { type: workAuthorizationSchema, required: true },
    reference: { type: contactPersonSchema, default: null },
    emergencyContacts: {
      type: [contactPersonSchema],
      validate: emergencyContactsValidator,
    },
    documents: { type: [documentSchema], default: [] },
  },
  { _id: false },
);

export type EmployeeData = InferSchemaType<typeof employeeDataSchema>;
