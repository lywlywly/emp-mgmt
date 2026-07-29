import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { OnboardingFormData } from "@/lib/onboarding";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type PercentCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useFormContext, useWatch } from "react-hook-form";

const cropSize = 256;

function releaseObjectUrl(url?: string) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function centerSquareCrop(width: number, height: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, 1, width, height),
    width,
    height,
  );
}

export function ProfilePictureField() {
  const form = useFormContext<OnboardingFormData>();
  const documents = useWatch({ control: form.control, name: "documents" });
  const profilePicture = documents.find(
    (document) => document.kind === "profile_photo",
  );
  const profilePictureSourceUrl = profilePicture?.sourceUrl;
  const imageRef = useRef<HTMLImageElement>(null);
  const profilePictureRef = useRef(profilePicture);
  const temporaryPhotoUrlRef = useRef<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<{
    fileName: string;
    url: string;
  } | null>(null);
  const [crop, setCrop] = useState<PercentCrop>();

  useEffect(() => {
    const previousPicture = profilePictureRef.current;

    if (previousPicture?.previewUrl !== profilePicture?.previewUrl) {
      releaseObjectUrl(previousPicture?.previewUrl);
    }
    if (previousPicture?.sourceUrl !== profilePicture?.sourceUrl) {
      releaseObjectUrl(previousPicture?.sourceUrl);
    }

    profilePictureRef.current = profilePicture;
  }, [profilePicture]);

  useEffect(() => {
    return () => {
      releaseObjectUrl(temporaryPhotoUrlRef.current ?? undefined);
    };
  }, []);

  function resetEditor() {
    releaseObjectUrl(temporaryPhotoUrlRef.current ?? undefined);
    temporaryPhotoUrlRef.current = null;
    setPendingPhoto(null);
    setCrop(undefined);
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    event.currentTarget.value = "";
    resetEditor();
    const url = URL.createObjectURL(file);
    temporaryPhotoUrlRef.current = url;
    setPendingPhoto({ fileName: file.name, url });
    setCrop(undefined);
  }

  async function saveCroppedPhoto() {
    const image = imageRef.current;
    if (!image || !pendingPhoto || !crop?.width || !crop.height) return;

    const canvas = document.createElement("canvas");
    canvas.width = cropSize;
    canvas.height = cropSize;
    const sourceX = (crop.x / 100) * image.naturalWidth;
    const sourceY = (crop.y / 100) * image.naturalHeight;
    const sourceWidth = (crop.width / 100) * image.naturalWidth;
    const sourceHeight = (crop.height / 100) * image.naturalHeight;
    canvas
      .getContext("2d")
      ?.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        cropSize,
        cropSize,
      );

    const croppedImage = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });
    if (!croppedImage) return;

    const previewUrl = URL.createObjectURL(croppedImage);
    form.setValue(
      "documents",
      [
        ...form
          .getValues("documents")
          .filter((document) => document.kind !== "profile_photo"),
        {
          kind: "profile_photo",
          fileName: pendingPhoto.fileName,
          mimeType: "image/jpeg",
          size: croppedImage.size,
          previewUrl,
          sourceUrl: pendingPhoto.url,
        },
      ],
      { shouldDirty: true },
    );
    temporaryPhotoUrlRef.current = null;
    setPendingPhoto(null);
    setCrop(undefined);
  }

  return (
    <Field>
      <FieldLabel htmlFor="profile-photo">Profile picture</FieldLabel>
      <div className="flex items-center gap-3">
        <div className="grid size-16 shrink-0 overflow-hidden rounded-full bg-muted text-xs text-muted-foreground">
          {profilePicture?.previewUrl ? (
            <img
              alt="Profile preview"
              className="size-full object-cover"
              src={profilePicture.previewUrl}
            />
          ) : (
            <UserRound
              aria-hidden="true"
              className="place-self-center size-6"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            accept="image/*"
            className="sr-only"
            id="profile-photo"
            onChange={selectPhoto}
            type="file"
          />
          <div className="flex gap-2">
            <label
              className={buttonVariants({ size: "sm", variant: "secondary" })}
              htmlFor="profile-photo"
            >
              Choose photo
            </label>
            {profilePictureSourceUrl && (
              <button
                className={buttonVariants({ size: "sm", variant: "secondary" })}
                onClick={() =>
                  setPendingPhoto({
                    fileName: profilePicture.fileName,
                    url: profilePictureSourceUrl,
                  })
                }
                type="button"
              >
                Adjust crop
              </button>
            )}
          </div>
          <FieldDescription>
            {profilePicture?.fileName ?? "No photo uploaded"}
          </FieldDescription>
        </div>
      </div>
      {pendingPhoto && (
        <div
          aria-labelledby="crop-photo-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg border bg-background p-5 shadow-lg">
            <div>
              <h2 className="font-semibold" id="crop-photo-title">
                Crop profile picture
              </h2>
              <p className="text-sm text-muted-foreground">
                Drag or resize the visible square to choose the photo region.
              </p>
            </div>
            <div className="flex max-h-[55vh] justify-center overflow-hidden bg-muted">
              <ReactCrop
                aspect={1}
                className="max-w-full"
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
              >
                <img
                  alt="Choose the profile photo crop"
                  onLoad={(event) =>
                    setCrop(
                      centerSquareCrop(
                        event.currentTarget.naturalWidth,
                        event.currentTarget.naturalHeight,
                      ),
                    )
                  }
                  ref={imageRef}
                  src={pendingPhoto.url}
                  style={{
                    height: "auto",
                    maxHeight: "55vh",
                    maxWidth: "100%",
                    width: "auto",
                  }}
                />
              </ReactCrop>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={resetEditor}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={!crop?.width}
                onClick={saveCroppedPhoto}
                size="sm"
                type="button"
              >
                Use photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </Field>
  );
}
