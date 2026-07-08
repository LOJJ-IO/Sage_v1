"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACCEPT_ATTRIBUTE,
  isSystemJunkFile,
  MAX_FILES_PER_BATCH,
  validateFileForUpload,
  type SageFile,
  type SkippedFile,
} from "@/lib/file-upload";
import { fetchFiles, uploadFiles as postFiles } from "@/lib/files-api";

export function useFileLibrary() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<SageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSkipped, setLastSkipped] = useState<SkippedFile[]>([]);

  const loadFiles = useCallback(async () => {
    setError(null);
    try {
      const nextFiles = await fetchFiles();
      setFiles(nextFiles);
    } catch {
      setError("Could not load files.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const uploadFiles = useCallback(
    async (selected: File[]) => {
      setError(null);
      setLastSkipped([]);

      const candidates = selected.filter((file) => !isSystemJunkFile(file.name));
      if (candidates.length === 0) {
        setError("No supported files selected.");
        return;
      }

      if (candidates.length > MAX_FILES_PER_BATCH) {
        setError(`Select at most ${MAX_FILES_PER_BATCH} files at a time.`);
        return;
      }

      const clientSkipped: SkippedFile[] = [];
      const accepted: File[] = [];

      for (const file of candidates) {
        const result = validateFileForUpload(file);
        if (!result.ok) {
          if (result.reason !== "System file skipped") {
            clientSkipped.push({ name: file.name, reason: result.reason });
          }
          continue;
        }
        accepted.push(file);
      }

      if (accepted.length === 0) {
        setLastSkipped(clientSkipped);
        setError(clientSkipped[0]?.reason ?? "No supported files selected.");
        return;
      }

      setIsUploading(true);
      try {
        const result = await postFiles(accepted);
        setLastSkipped([...clientSkipped, ...result.skipped]);
        await loadFiles();
        if (result.skipped.length > 0 && result.uploaded.length > 0) {
          setError(
            `Uploaded ${result.uploaded.length} file(s). ${result.skipped.length} skipped.`,
          );
        } else if (clientSkipped.length > 0 && result.uploaded.length > 0) {
          setError(
            `Uploaded ${result.uploaded.length} file(s). ${clientSkipped.length} skipped.`,
          );
        }
      } catch (uploadError) {
        setLastSkipped(clientSkipped);
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Upload failed. Please try again.",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [loadFiles],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (selected.length > 0) {
        void uploadFiles(selected);
      }
    },
    [uploadFiles],
  );

  const inputProps = {
    type: "file" as const,
    multiple: true,
    accept: ACCEPT_ATTRIBUTE,
    className: "sr-only",
    onChange: handleInputChange,
    disabled: isUploading,
  };

  return {
    files,
    isLoading,
    isUploading,
    error,
    lastSkipped,
    openFilePicker,
    inputRef,
    inputProps,
    reloadFiles: loadFiles,
  };
}
