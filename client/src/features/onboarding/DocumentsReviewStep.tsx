import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { StepHeading } from "@/features/onboarding/StepHeading";
import { RequiredIndicator } from "@/features/onboarding/RequiredIndicator";
import { filePreviewUrl } from "@/lib/files";
import type {
  OnboardingDocumentKind,
  OnboardingFormData,
} from "@/lib/onboarding";
import type { ChangeEvent } from "react";
import { useFormContext, useWatch } from "react-hook-form";

function workAuthorizationDocumentLabel(
  type: OnboardingFormData["workAuthorization"]["type"],
) {
  switch (type) {
    case "h1b":
      return "H-1B Approval Notice (Form I-797)";
    case "l2":
      return "L-2 work-authorization document";
    case "f1":
      return "OPT receipt (Form I-797C)";
    case "h4":
      return "H-4 work-authorization document";
    default:
      return "Work-authorization document";
  }
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "Not provided"}</dd>
    </div>
  );
}

export function DocumentsReviewStep() {
  const form = useFormContext<OnboardingFormData>();
  const values = useWatch({
    control: form.control,
  }) as OnboardingFormData;

  function updateDocument(
    kind: OnboardingDocumentKind,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    const existingDocument = form
      .getValues("documents")
      .find((document) => document.kind === kind);
    if (existingDocument?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(existingDocument.previewUrl);
    }
    const remainingDocuments = form
      .getValues("documents")
      .filter((document) => document.kind !== kind);

    form.setValue(
      "documents",
      file
        ? [
            ...remainingDocuments,
            {
              kind,
              fileName: file.name,
              file,
              mimeType: file.type,
              size: file.size,
              previewUrl: URL.createObjectURL(file),
            },
          ]
        : remainingDocuments,
      { shouldDirty: true },
    );
  }

  function documentFor(kind: OnboardingDocumentKind) {
    return values.documents.find((document) => document.kind === kind);
  }

  const citizenOrResident =
    values.workAuthorization.isUsCitizenOrPermanentResident;
  const documentFields = [
    {
      kind: "drivers_license" as const,
      label: "Driver’s license (optional)",
      accept: "image/*,application/pdf",
      required: false,
    },
    ...(citizenOrResident === false
      ? [
          {
            kind: "work_authorization" as const,
            label: workAuthorizationDocumentLabel(
              values.workAuthorization.type,
            ),
            accept: "image/*,application/pdf",
            required: true,
          },
        ]
      : []),
  ];

  return (
    <FieldGroup>
      <StepHeading
        title="Documents and review"
        description="Choose your supporting files, then review the information entered so far."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {documentFields.map((documentField) => {
          const document = documentFor(documentField.kind);
          const previewUrl =
            document?.previewUrl ??
            document?.sourceUrl ??
            (document?.id ? filePreviewUrl(document.id) : undefined);

          return (
            <Field key={documentField.kind}>
              <FieldLabel htmlFor={documentField.kind}>
                {documentField.label}
                {documentField.required && <RequiredIndicator />}
              </FieldLabel>
              <Input
                accept={documentField.accept}
                id={documentField.kind}
                onChange={(event) =>
                  updateDocument(documentField.kind, event)
                }
                type="file"
              />
              <FieldDescription>
                {document ? (
                  <span className="flex items-center gap-2">
                    {document.fileName}
                    {previewUrl && (
                      <a
                        className="text-primary underline underline-offset-4"
                        href={previewUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Preview
                      </a>
                    )}
                  </span>
                ) : (
                  "No file selected"
                )}
              </FieldDescription>
            </Field>
          );
        })}
      </div>
      <FieldError errors={[form.formState.errors.documents]} />
      <Separator />
      <dl className="grid gap-4 sm:grid-cols-2">
        <ReviewItem
          label="Legal name"
          value={[
            values.name.firstName,
            values.name.middleName,
            values.name.lastName,
          ]
            .filter(Boolean)
            .join(" ")}
        />
        <ReviewItem label="Email" value={values.contact.email} />
        <ReviewItem
          label="Address"
          value={[
            values.address.street,
            values.address.city,
            values.address.state,
          ]
            .filter(Boolean)
            .join(", ")}
        />
        <ReviewItem label="Cell phone" value={values.contact.cellPhone} />
        <ReviewItem
          label="Emergency contacts"
          value={String(values.emergencyContacts.length)}
        />
        <ReviewItem
          label="Uploaded documents"
          value={
            values.documents.map((document) => document.fileName).join(", ") ||
            "None"
          }
        />
        <ReviewItem
          label="Work authorization"
          value={
            citizenOrResident === true
              ? values.workAuthorization.residentOrCitizenType === "green_card"
                ? "Green Card"
                : "Citizen"
              : (values.workAuthorization.type?.toUpperCase() ?? "Not provided")
          }
        />
      </dl>
    </FieldGroup>
  );
}
