import type { OnboardingDocumentKind } from "@/lib/onboarding";
import type {
  OnboardingApplication,
  OnboardingApplicationData,
} from "@emp-mgmt/shared";
import { fileDownloadUrl } from "@/lib/files";

type SubmittedOnboardingProps = {
  application: OnboardingApplication;
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "Not provided"}</dd>
    </div>
  );
}

function fullName({
  firstName,
  middleName,
  lastName,
}: Pick<
  OnboardingApplicationData["name"],
  "firstName" | "middleName" | "lastName"
>) {
  return [firstName, middleName, lastName].filter(Boolean).join(" ");
}

function contactSummary(
  contact: NonNullable<OnboardingApplicationData["reference"]>,
) {
  return [
    fullName(contact),
    contact.relationship && `(${contact.relationship})`,
    contact.phone,
    contact.email,
  ]
    .filter(Boolean)
    .join(" · ");
}

function workAuthorizationLabel(data: OnboardingApplicationData) {
  const authorization = data.workAuthorization;

  if (authorization.isUsCitizenOrPermanentResident) {
    return authorization.residentOrCitizenType === "green_card"
      ? "Green Card holder"
      : "U.S. citizen";
  }

  if (authorization.type === "other") return authorization.otherType;

  switch (authorization.type) {
    case "h1b":
      return "H-1B";
    case "l2":
      return "L-2";
    case "f1":
      return "F-1 (CPT/OPT)";
    case "h4":
      return "H-4";
    default:
      return "Not provided";
  }
}

function documentLabel(kind: OnboardingDocumentKind) {
  return (
    {
      profile_photo: "Profile photo",
      drivers_license: "Driver’s license",
      work_authorization: "Work authorization",
    }[kind] ?? kind
  );
}

function maskedSsn(ssn: string) {
  const digits = ssn.replace(/\D/g, "");
  return digits ? `•••-••-${digits.slice(-4)}` : "Not provided";
}

export function SubmittedOnboarding({ application }: SubmittedOnboardingProps) {
  const { data } = application;
  const referenceProvided =
    data.reference && Object.values(data.reference).some(Boolean);

  return (
    <div className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">Pending review</p>
        <h2 className="font-semibold">Submitted application</h2>
        <p className="text-sm text-muted-foreground">
          HR is reviewing your application. Submitted information cannot be
          edited while it is pending.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <section>
          <h3 className="font-medium">Personal information</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <Detail label="Legal name" value={fullName(data.name)} />
            <Detail label="Preferred name" value={data.name.preferredName} />
            <Detail label="Email" value={data.contact.email} />
            <Detail label="Cell phone" value={data.contact.cellPhone} />
            <Detail label="Work phone" value={data.contact.workPhone} />
            <Detail
              label="Date of birth"
              value={data.personalDetails.dateOfBirth}
            />
            <Detail
              label="Gender"
              value={
                data.personalDetails.gender === "decline"
                  ? "I do not wish to answer"
                  : (data.personalDetails.gender ?? "Not provided")
              }
            />
            <Detail label="SSN" value={maskedSsn(data.personalDetails.ssn)} />
            <Detail
              label="Address"
              value={[
                data.address.buildingOrApt,
                data.address.street,
                data.address.city,
                data.address.state,
                data.address.zipCode,
              ]
                .filter(Boolean)
                .join(", ")}
            />
          </dl>
        </section>

        <section>
          <h3 className="font-medium">Work authorization</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <Detail label="Status" value={workAuthorizationLabel(data)} />
            {data.workAuthorization.isUsCitizenOrPermanentResident ===
              false && (
              <>
                <Detail
                  label="Start date"
                  value={data.workAuthorization.startDate}
                />
                <Detail
                  label="End date"
                  value={data.workAuthorization.endDate}
                />
              </>
            )}
          </dl>
        </section>

        <section>
          <h3 className="font-medium">Contacts</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            {data.emergencyContacts.map((contact, index) => (
              <Detail
                key={`${contact.email}-${index}`}
                label={`Emergency contact ${index + 1}`}
                value={contactSummary(contact)}
              />
            ))}
            {referenceProvided && (
              <Detail
                label="Reference"
                value={contactSummary(data.reference!)}
              />
            )}
          </dl>
        </section>

        <section>
          <h3 className="font-medium">Submitted documents</h3>
          {data.documents.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {data.documents.map((document) => (
                <li
                  className="flex items-center justify-between gap-3"
                  key={document.id}
                >
                  <span>
                    <span className="font-medium">
                      {documentLabel(document.kind)}:
                    </span>{" "}
                    {document.fileName}
                  </span>
                  <a
                    className="shrink-0 text-primary underline-offset-4 hover:underline"
                    href={fileDownloadUrl(document.id)}
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No documents submitted.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
