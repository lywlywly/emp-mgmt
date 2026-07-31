import { Field, FieldLabel } from "@/components/ui/field";
import { ProfilePhotoPicker } from "@/features/onboarding/ProfilePhotoPicker";
import type { OnboardingFormData } from "@/lib/onboarding";
import { useFormContext, useWatch } from "react-hook-form";

export function ProfilePictureField() {
  const form = useFormContext<OnboardingFormData>();
  const documents = useWatch({ control: form.control, name: "documents" });
  const profilePicture = documents.find(
    (document) => document.kind === "profile_photo",
  );
  return (
    <Field>
      <FieldLabel htmlFor="profile-photo">Profile picture</FieldLabel>
      <ProfilePhotoPicker
        photo={profilePicture}
        onChange={({ file, fileName, previewUrl, sourceUrl }) =>
          form.setValue(
            "documents",
            [
              ...form
                .getValues("documents")
                .filter((document) => document.kind !== "profile_photo"),
              {
                kind: "profile_photo",
                fileName,
                file,
                mimeType: "image/jpeg",
                size: file.size,
                previewUrl,
                sourceUrl,
              },
            ],
            { shouldDirty: true },
          )
        }
      />
    </Field>
  );
}
