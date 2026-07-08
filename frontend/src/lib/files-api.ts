import type { SageFile, SkippedFile, UploadFilesResult } from "@/lib/file-upload";

export async function fetchFiles(): Promise<SageFile[]> {
  const response = await fetch("/api/files", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load files");
  }
  const data = (await response.json()) as { files: SageFile[] };
  return data.files;
}

export async function uploadFiles(files: File[]): Promise<UploadFilesResult> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch("/api/files", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as
    | UploadFilesResult
    | { error: string; skipped?: SkippedFile[] };

  if (!response.ok) {
    const message =
      "error" in data ? data.error : "Upload failed. Please try again.";
    throw new Error(message);
  }

  return data as UploadFilesResult;
}
