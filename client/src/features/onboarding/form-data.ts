import type { EmergencyContact, OnboardingFormData } from "@/lib/onboarding";
import type { OnboardingApplicationData } from "@emp-mgmt/shared";
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

export function onboardingFormValues(
  application?: OnboardingApplicationData,
): OnboardingFormData {
  if (!application) return onboardingDefaultValues;

  return {
    ...application,
    name: { ...application.name },
    address: { ...application.address },
    contact: { ...application.contact },
    personalDetails: { ...application.personalDetails },
    workAuthorization: { ...application.workAuthorization },
    reference: application.reference
      ? { ...application.reference }
      : emptyContact(),
    emergencyContacts: application.emergencyContacts.map((contact) => ({
      ...contact,
    })),
    documents: application.documents.map((document) => ({ ...document })),
  };
}
