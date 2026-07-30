import {
  employeeProfileSchema,
  onboardingApplicationDataSchema,
  type EmployeeProfile as EmployeeProfileResponse,
  type OnboardingApplicationData,
} from "@emp-mgmt/shared";
import type { EmployeeData } from "../models/valueObjects.js";
import { FileMetadataModel } from "../models/FileMetadata.js";

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function presentEmployeeData(
  data: EmployeeData,
): Promise<OnboardingApplicationData> {
  const fileIds = data.documents.map((document) => String(document.file));
  const files = await FileMetadataModel.find({ _id: { $in: fileIds } }).lean();
  const filesById = new Map(files.map((file) => [String(file._id), file]));

  const documents = data.documents.map((document) => {
    const file = filesById.get(String(document.file));
    if (!file) {
      throw new Error("An employee document could not be loaded.");
    }
    return {
      kind: document.kind,
      id: String(file._id),
      fileName: file.originalName,
      mimeType: file.mimetype,
      size: file.size,
    };
  });

  return onboardingApplicationDataSchema.parse({
    ...data,
    personalDetails: {
      ...data.personalDetails,
      dateOfBirth: dateValue(data.personalDetails.dateOfBirth),
    },
    workAuthorization: {
      ...data.workAuthorization,
      startDate: data.workAuthorization.startDate
        ? dateValue(data.workAuthorization.startDate)
        : "",
      endDate: data.workAuthorization.endDate
        ? dateValue(data.workAuthorization.endDate)
        : "",
    },
    documents,
  });
}

export async function presentEmployeeProfile(profile: {
  _id: unknown;
  user: unknown;
  data: EmployeeData;
}): Promise<EmployeeProfileResponse> {
  return employeeProfileSchema.parse({
    id: String(profile._id),
    userId: String(profile.user),
    data: await presentEmployeeData(profile.data),
  });
}
