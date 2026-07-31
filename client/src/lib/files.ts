export function fileDownloadUrl(fileId: string) {
  return `/files/${fileId}/download`;
}

export function filePreviewUrl(fileId: string) {
  return `/files/${fileId}/preview`;
}

export async function uploadFile(file: File) {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/files", {
    method: "POST",
    body,
    credentials: "include",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? `Could not upload ${file.name}.`);
  }
  return response.json() as Promise<{ id: string }>;
}
