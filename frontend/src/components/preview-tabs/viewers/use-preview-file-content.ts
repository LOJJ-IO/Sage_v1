"use client";

import { useEffect, useState } from "react";

import {
  downloadBackendFile,
  fetchBackendFileText,
  isBackendConfigured,
} from "@/lib/files/api";
import type { SageFileType } from "@/lib/file-upload";

type CachedBlob = { kind: "blob"; blob: Blob };
type CachedText = { kind: "text"; text: string };
type Cached = CachedBlob | CachedText;

/** Survives remounts within the session so focusing the same file skips a re-download. */
const contentCache = new Map<string, Cached>();

export type PreviewFileContent =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; kind: "blob"; blob: Blob; blobUrl: string }
  | { status: "ready"; kind: "text"; text: string };

function usesExtractedText(fileType: SageFileType): boolean {
  return fileType === "docx";
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Failed to load file preview.";
}

function hasLocalBytes(localFile: File | Blob | null | undefined): localFile is File | Blob {
  return Boolean(localFile && localFile.size > 0);
}

/**
 * Resolve preview bytes/text for a tab.
 * Prefers an in-memory `File` from the library (standalone / just-uploaded),
 * otherwise hits the backend. Docx always needs `/text` when no local path exists.
 */
export function usePreviewFileContent(
  resourceKey: string,
  fileType: SageFileType,
  localFile?: File | Blob | null,
): PreviewFileContent {
  const [content, setContent] = useState<PreviewFileContent>({ status: "loading" });
  const localSize = localFile?.size ?? 0;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setContent({ status: "loading" });

      try {
        // Standalone / just-uploaded: use the browser File we already have.
        if (hasLocalBytes(localFile) && !usesExtractedText(fileType)) {
          const blob: Blob = localFile;
          if (cancelled) {
            return;
          }
          contentCache.set(resourceKey, { kind: "blob", blob });
          objectUrl = URL.createObjectURL(blob);
          setContent({
            status: "ready",
            kind: "blob",
            blob,
            blobUrl: objectUrl,
          });
          return;
        }

        if (usesExtractedText(fileType) && hasLocalBytes(localFile) && !isBackendConfigured()) {
          if (cancelled) {
            return;
          }
          setContent({
            status: "error",
            message:
              "Word (.docx) preview needs the backend’s extracted text. Set NEXT_PUBLIC_API_URL and upload while connected.",
          });
          return;
        }

        const cached = contentCache.get(resourceKey);
        if (cached) {
          if (cancelled) {
            return;
          }
          if (cached.kind === "text") {
            setContent({ status: "ready", kind: "text", text: cached.text });
            return;
          }
          objectUrl = URL.createObjectURL(cached.blob);
          setContent({
            status: "ready",
            kind: "blob",
            blob: cached.blob,
            blobUrl: objectUrl,
          });
          return;
        }

        if (usesExtractedText(fileType)) {
          const text = await fetchBackendFileText(resourceKey);
          if (cancelled) {
            return;
          }
          contentCache.set(resourceKey, { kind: "text", text });
          setContent({ status: "ready", kind: "text", text });
          return;
        }

        const blob = await downloadBackendFile(resourceKey);
        if (cancelled) {
          return;
        }
        contentCache.set(resourceKey, { kind: "blob", blob });
        objectUrl = URL.createObjectURL(blob);
        setContent({
          status: "ready",
          kind: "blob",
          blob,
          blobUrl: objectUrl,
        });
      } catch (err) {
        if (cancelled) {
          return;
        }
        setContent({ status: "error", message: errorMessage(err) });
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resourceKey, fileType, localFile, localSize]);

  return content;
}

/** Test / hot-reload helper — not used by production UI. */
export function clearPreviewFileContentCache() {
  contentCache.clear();
}
