"use client";

import { useEffect, useState } from "react";

import { downloadBackendFile } from "@/lib/files/api";
import type { SageFileType } from "@/lib/file-upload";

type CachedBlob = { kind: "blob"; blob: Blob };

/** Survives remounts within the session so focusing the same file skips a re-download. */
const contentCache = new Map<string, CachedBlob>();

export type PreviewFileContent =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; kind: "blob"; blob: Blob; blobUrl: string };

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
 * Resolve raw preview bytes for a tab. Every previewable file type is a blob
 * now — docx used to need server-extracted text/markdown here, but mammoth.js
 * (see `DocxViewer`) converts raw bytes client-side, so docx is exactly like
 * pdf/image: prefer an in-memory `File` from the library when present
 * (standalone / just-uploaded), otherwise download from the backend.
 */
export function usePreviewFileContent(
  resourceKey: string,
  _fileType: SageFileType,
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
        if (hasLocalBytes(localFile)) {
          const blob: Blob = localFile;
          if (cancelled) {
            return;
          }
          contentCache.set(resourceKey, { kind: "blob", blob });
          objectUrl = URL.createObjectURL(blob);
          setContent({ status: "ready", kind: "blob", blob, blobUrl: objectUrl });
          return;
        }

        const cached = contentCache.get(resourceKey);
        if (cached) {
          if (cancelled) {
            return;
          }
          objectUrl = URL.createObjectURL(cached.blob);
          setContent({ status: "ready", kind: "blob", blob: cached.blob, blobUrl: objectUrl });
          return;
        }

        const blob = await downloadBackendFile(resourceKey);
        if (cancelled) {
          return;
        }
        contentCache.set(resourceKey, { kind: "blob", blob });
        objectUrl = URL.createObjectURL(blob);
        setContent({ status: "ready", kind: "blob", blob, blobUrl: objectUrl });
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
  }, [resourceKey, localFile, localSize]);

  return content;
}

/** Test / hot-reload helper — not used by production UI. */
export function clearPreviewFileContentCache() {
  contentCache.clear();
}
