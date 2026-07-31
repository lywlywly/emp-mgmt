import type {
  OnboardingApplicationData,
  OnboardingDocumentKind,
} from "@emp-mgmt/shared";

type SharedDocument = OnboardingApplicationData["documents"][number];

export type { OnboardingDocumentKind };

export type OnboardingDocument = Omit<SharedDocument, "id"> & {
  id?: string;
  file?: File;
  fileName: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
  sourceUrl?: string;
};

export type PersonName = OnboardingApplicationData["name"];
export type Address = OnboardingApplicationData["address"];
export type ContactDetails = OnboardingApplicationData["contact"];
export type PersonalDetails = OnboardingApplicationData["personalDetails"];
export type ContactName = Pick<
  PersonName,
  "firstName" | "middleName" | "lastName"
>;
export type EmergencyContact =
  OnboardingApplicationData["emergencyContacts"][number];
export type ReferenceContact = NonNullable<
  OnboardingApplicationData["reference"]
>;
export type WorkAuthorization = OnboardingApplicationData["workAuthorization"];

export type OnboardingFormData = {
  name: PersonName;
  address: Address;
  contact: ContactDetails;
  personalDetails: PersonalDetails;
  workAuthorization: WorkAuthorization;
  reference: ReferenceContact;
  emergencyContacts: EmergencyContact[];
  documents: OnboardingDocument[];
};
