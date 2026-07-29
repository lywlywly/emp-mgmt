import type { EmergencyContact, OnboardingFormData } from "@/lib/onboarding";
import type { FieldPath } from "react-hook-form";

export const onboardingSteps: {
  label: string;
  fields: FieldPath<OnboardingFormData>[];
}[] = [
  {
    label: "Personal",
    fields: ["name", "address", "contact", "personalDetails"],
  },
  { label: "Work authorization", fields: ["workAuthorization"] },
  { label: "Contacts", fields: ["emergencyContacts", "reference"] },
  { label: "Documents", fields: ["documents"] },
];

export const emptyContact = (): EmergencyContact => ({
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  relationship: "",
});

export const onboardingDefaultValues: OnboardingFormData = {
  name: {
    firstName: "",
    middleName: "",
    lastName: "",
    preferredName: "",
  },
  address: {
    buildingOrApt: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
  },
  contact: {
    email: "jordan.lee@example.com",
    cellPhone: "",
    workPhone: "",
  },
  personalDetails: {
    ssn: "",
    dateOfBirth: "",
    gender: null,
  },
  workAuthorization: {
    isUsCitizenOrPermanentResident: null,
    residentOrCitizenType: null,
    type: null,
    otherType: "",
    startDate: "",
    endDate: "",
  },
  reference: emptyContact(),
  emergencyContacts: [emptyContact()],
  documents: [],
};
