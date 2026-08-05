import { apiFetch, getApiBaseUrl, getAuthToken } from "@/lib/api/client";
import type { FileIngestStatus } from "@/lib/file-upload";

export type FileRecord = {
  file_id: string;
  filename: string;
  status: FileIngestStatus;
  looks_scanned: boolean;
  error: string | null;
};

export function isBackendConfigured() {
  return Boolean(getApiBaseUrl());
}

export async function listBackendFiles(): Promise<FileRecord[]> {
  return apiFetch<FileRecord[]>("/files");
}

export async function uploadBackendFile(file: File): Promise<FileRecord> {
  const body = new FormData();
  body.append("upload", file, file.name);
  return apiFetch<FileRecord>("/files", { method: "POST", body });
}

export async function replaceBackendFile(
  fileId: string,
  file: File
): Promise<FileRecord> {
  const body = new FormData();
  body.append("upload", file, file.name);
  return apiFetch<FileRecord>(`/files/${fileId}`, { method: "PUT", body });
}

export async function deleteBackendFile(fileId: string): Promise<void> {
  await apiFetch<void>(`/files/${fileId}`, { method: "DELETE" });
}

/** Direct fetch (not apiFetch) because the response is a blob, not JSON. */
export async function downloadBackendFile(fileId: string): Promise<Blob> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "API is not configured. Set NEXT_PUBLIC_API_URL to connect to the backend.",
    );
  }
  const token = getAuthToken();
  const response = await fetch(`${baseUrl}/files/${fileId}/content`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Failed to download file (${response.status})`);
  }

  return response.blob();
}

/** Extracted text from ingestion chunks — used for docx preview (no in-browser renderer). */
export async function fetchBackendFileText(fileId: string): Promise<string> {
  const body = await apiFetch<{ text: string }>(`/files/${fileId}/text`);
  return body.text;
}

/** Docling's markdown export (real tables/headings) — null until the file's been
 * (re)ingested with this field, in which case callers fall back to `/text`. */
export async function fetchBackendFilePreview(fileId: string): Promise<string | null> {
  const body = await apiFetch<{ markdown: string | null }>(`/files/${fileId}/preview`);
  return body.markdown;
}
