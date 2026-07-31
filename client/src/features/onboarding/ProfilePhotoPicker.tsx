import { Button, buttonVariants } from "@/components/ui/button";
import { UserRound } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type PercentCrop,
} from "react-image-crop";

import "react-image-crop/dist/ReactCrop.css";

const cropSize = 256;

function centerSquareCrop(width: number, height: number) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, 1, width, height),
    width,
    height,
  );
}

export type ProfilePhoto = {
  fileName: string;
  previewUrl?: string;
  sourceUrl?: string;
};

export function ProfilePhotoPicker({
  photo,
  onChange,
}: {
  photo?: ProfilePhoto;
  onChange: (photo: {
    file: File;
    fileName: string;
    previewUrl: string;
    sourceUrl: string;
  }) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const temporaryPhotoUrlRef = useRef<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<{
    fileName: string;
    url: string;
  } | null>(null);
  const [crop, setCrop] = useState<PercentCrop>();

  useEffect(
    () => () => {
      if (temporaryPhotoUrlRef.current) {
        URL.revokeObjectURL(temporaryPhotoUrlRef.current);
      }
    },
    [],
  );

  function resetEditor() {
    if (temporaryPhotoUrlRef.current) {
      URL.revokeObjectURL(temporaryPhotoUrlRef.current);
    }
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
  }

  async function saveCroppedPhoto() {
    const image = imageRef.current;
    if (!image || !pendingPhoto || !crop?.width || !crop.height) return;

    const canvas = document.createElement("canvas");
    canvas.width = cropSize;
    canvas.height = cropSize;
    canvas
      .getContext("2d")
      ?.drawImage(
        image,
        (crop.x / 100) * image.naturalWidth,
        (crop.y / 100) * image.naturalHeight,
        (crop.width / 100) * image.naturalWidth,
        (crop.height / 100) * image.naturalHeight,
        0,
        0,
        cropSize,
        cropSize,
      );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return;

    const file = new File([blob], pendingPhoto.fileName, {
      type: "image/jpeg",
    });
    const previewUrl = URL.createObjectURL(blob);
    onChange({
      file,
      fileName: pendingPhoto.fileName,
      previewUrl,
      sourceUrl: pendingPhoto.url,
    });
    temporaryPhotoUrlRef.current = null;
    setPendingPhoto(null);
    setCrop(undefined);
  }

  const imageUrl = photo?.previewUrl ?? photo?.sourceUrl;
  const inputId = "profile-photo";

  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 overflow-hidden rounded-full bg-muted text-xs text-muted-foreground">
        {imageUrl ? (
          <img
            alt="Profile preview"
            className="size-full object-cover"
            src={imageUrl}
          />
        ) : (
          <UserRound aria-hidden="true" className="place-self-center size-6" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <input
          accept="image/*"
          className="sr-only"
          id={inputId}
          onChange={selectPhoto}
          type="file"
        />
        <div className="flex gap-2">
          <label
            className={buttonVariants({ size: "sm", variant: "secondary" })}
            htmlFor={inputId}
          >
            Choose photo
          </label>
          {photo?.sourceUrl && (
            <Button
              onClick={() =>
                setPendingPhoto({
                  fileName: photo.fileName,
                  url: photo.sourceUrl!,
                })
              }
              size="sm"
              type="button"
              variant="secondary"
            >
              Adjust crop
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {photo?.fileName ?? "No photo uploaded"}
        </p>
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
                onChange={(_, value) => setCrop(value)}
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
    </div>
  );
}
