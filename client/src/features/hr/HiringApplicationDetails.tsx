import type { ReactNode } from "react";

import type { EmployeeProfile, OnboardingApplication } from "@emp-mgmt/shared";

import { fileDownloadUrl, filePreviewUrl } from "@/lib/files";

export function HiringApplicationDetails({
  profile,
}: {
  profile: OnboardingApplication | EmployeeProfile;
}) {
  const {
    address,
    contact,
    documents,
    emergencyContacts,
    name,
    personalDetails,
    reference,
    workAuthorization,
  } = profile.data;
  const fullName = [name.firstName, name.middleName, name.lastName]
    .filter(Boolean)
    .join(" ");
  const workAuthorizationLabel =
    workAuthorization.isUsCitizenOrPermanentResident
      ? workAuthorization.residentOrCitizenType === "green_card"
        ? "Green Card"
        : "Citizen"
      : workAuthorization.type === "other"
        ? workAuthorization.otherType
        : (workAuthorization.type?.toUpperCase() ?? "—");

  return (
    <div className="space-y-5 text-sm">
      <div>
        <h2 className="font-semibold">{fullName}</h2>
        <p className="text-muted-foreground">{contact.email}</p>
      </div>

      <ReviewSection title="Personal information">
        <Detail label="Legal name" value={fullName} />
        <Detail label="Preferred name" value={name.preferredName || "—"} />
        <Detail label="SSN" value={personalDetails.ssn} />
        <Detail label="Date of birth" value={personalDetails.dateOfBirth} />
        <Detail
          label="Gender"
          value={
            personalDetails.gender === "decline"
              ? "Prefer not to say"
              : personalDetails.gender
          }
        />
      </ReviewSection>

      <ReviewSection title="Address and contact">
        <Detail
          label="Address"
          value={[
            address.buildingOrApt,
            address.street,
            address.city,
            address.state,
            address.zipCode,
          ]
            .filter(Boolean)
            .join(", ")}
        />
        <Detail label="Email" value={contact.email} />
        <Detail label="Cell phone" value={contact.cellPhone} />
        <Detail label="Work phone" value={contact.workPhone || "—"} />
      </ReviewSection>

      <ReviewSection title="Work authorization">
        <Detail label="Status" value={workAuthorizationLabel} />
        {!workAuthorization.isUsCitizenOrPermanentResident && (
          <Detail
            label="Valid dates"
            value={`${workAuthorization.startDate} to ${workAuthorization.endDate}`}
          />
        )}
      </ReviewSection>

      <div>
        <h3 className="font-medium">Reference</h3>
        {reference ? (
          <dl className="mt-2 grid gap-3 sm:grid-cols-2">
            <Detail
              label="Name"
              value={[
                reference.firstName,
                reference.middleName,
                reference.lastName,
              ]
                .filter(Boolean)
                .join(" ")}
            />
            <Detail label="Relationship" value={reference.relationship} />
            <Detail label="Phone" value={reference.phone || "—"} />
            <Detail label="Email" value={reference.email || "—"} />
          </dl>
        ) : (
          <p className="mt-1 text-muted-foreground">No reference provided.</p>
        )}
      </div>

      <div>
        <h3 className="font-medium">Emergency contacts</h3>
        <div className="mt-2 space-y-3">
          {emergencyContacts.map((person, index) => (
            <dl
              className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
              key={`${person.email}-${index}`}
            >
              <Detail
                label="Name"
                value={[person.firstName, person.middleName, person.lastName]
                  .filter(Boolean)
                  .join(" ")}
              />
              <Detail label="Relationship" value={person.relationship} />
              <Detail label="Phone" value={person.phone || "—"} />
              <Detail label="Email" value={person.email || "—"} />
            </dl>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium">Uploaded documents</h3>
        {documents.length ? (
          <ul className="mt-2 space-y-2">
            {documents.map((document) => (
              <li
                className="flex items-center justify-between gap-3 rounded-md border p-3"
                key={document.id}
              >
                <span>{document.fileName}</span>
                <span className="flex shrink-0 gap-3">
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href={filePreviewUrl(document.id)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Preview
                  </a>
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href={fileDownloadUrl(document.id)}
                  >
                    Download
                  </a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-muted-foreground">No documents uploaded.</p>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function ReviewSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      <dl className="mt-2 grid gap-3 sm:grid-cols-2">{children}</dl>
    </div>
  );
}
