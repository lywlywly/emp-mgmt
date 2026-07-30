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
export type PersonalDetails = Omit<
  OnboardingApplicationData["personalDetails"],
  "gender"
> & {
  gender: OnboardingApplicationData["personalDetails"]["gender"] | null;
};
export type ContactName = Pick<
  PersonName,
  "firstName" | "middleName" | "lastName"
>;
export type EmergencyContact =
  OnboardingApplicationData["emergencyContacts"][number];
export type ReferenceContact = NonNullable<
  OnboardingApplicationData["reference"]
>;
export type WorkAuthorizationType = NonNullable<
  OnboardingApplicationData["workAuthorization"]["type"]
>;

export type WorkAuthorization = {
  isUsCitizenOrPermanentResident: boolean | null;
  residentOrCitizenType: "green_card" | "citizen" | null;
  type: WorkAuthorizationType | null;
  otherType: string;
  startDate: string;
  endDate: string;
};

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
