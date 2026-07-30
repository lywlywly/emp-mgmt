export type OnboardingStatus =
  "not_started" | "pending" | "rejected" | "approved";

export type OnboardingDocumentKind =
  "profile_photo" | "drivers_license" | "work_authorization";

export type OnboardingDocument = {
  kind: OnboardingDocumentKind;
  fileName: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
  sourceUrl?: string;
};

export type PersonName = {
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
};

export type Address = {
  buildingOrApt: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
};

export type ContactDetails = {
  email: string;
  cellPhone: string;
  workPhone: string;
};

export type PersonalDetails = {
  ssn: string;
  dateOfBirth: string;
  gender: "male" | "female" | "decline" | null;
};

export type ContactName = {
  firstName: string;
  middleName: string;
  lastName: string;
};

export type EmergencyContact = ContactName & {
  phone: string;
  email: string;
  relationship: string;
};

export type ReferenceContact = EmergencyContact;

export type WorkAuthorizationType = "h1b" | "l2" | "f1" | "h4" | "other";

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

export type OnboardingApplication = {
  id: string;
  status: OnboardingStatus;
  canEdit: boolean;
  hrFeedback: string | null;
  submittedAt: string | null;
  data: OnboardingFormData;
};

export type OptDocumentKind = "opt_receipt" | "opt_ead" | "i_983" | "i_20";

export type OptDocumentStatus =
  "not_started" | "pending" | "approved" | "rejected";

export type OptDocumentFile = {
  fileName: string;
  mimeType: string;
  size: number;
};

export type OptDocument = {
  kind: OptDocumentKind;
  status: OptDocumentStatus;
  feedback: string | null;
  file: OptDocumentFile | null;
};

export type OptNextAction = {
  type: "upload" | "wait_for_hr" | "complete";
  document: OptDocumentKind | null;
  message: string;
};

export type OptWorkflow = {
  applies: boolean;
  documents: OptDocument[];
  nextAction: OptNextAction;
};

export type OptDocumentSubmission = OptDocumentFile & {
  kind: OptDocumentKind;
};

export type HrOnboardingApplication = OnboardingApplication & {
  employeeId: string;
  employeeName: string;
};

export type HrOnboardingApplicationSummary = Pick<
  HrOnboardingApplication,
  "id" | "employeeId" | "employeeName" | "status" | "submittedAt"
>;

export type HrOptEmployee = {
  employeeId: string;
  employeeName: string;
  workflow: OptWorkflow;
};
