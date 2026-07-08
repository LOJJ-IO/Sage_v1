"use client";

import { useCallback, useRef, useState } from "react";
import {
  ACCEPT_ATTRIBUTE,
  isSystemJunkFile,
  tagsFromFilename,
  validateFileForUpload,
  type LibraryFile,
} from "@/lib/file-upload";

export function useFileLibrary() {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIdRef = useRef<string | null>(null);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const addFiles = useCallback((selected: File[]) => {
    setError(null);

    const accepted: LibraryFile[] = [];
    let firstSkipReason: string | null = null;
    let skippedCount = 0;

    for (const file of selected) {
      if (isSystemJunkFile(file.name)) continue;

      const result = validateFileForUpload(file);
      if (!result.ok) {
        skippedCount += 1;
        firstSkipReason ??= result.reason;
        continue;
      }

      accepted.push({
        id: crypto.randomUUID(),
        file,
        fileType: result.fileType,
        tags: tagsFromFilename(file.name),
        isBookmarked: false,
      });
    }

    if (accepted.length > 0) {
      setFiles((current) => [...current, ...accepted]);
    }

    if (accepted.length === 0) {
      setError(firstSkipReason ?? "No supported files selected.");
    } else if (skippedCount > 0) {
      setError(
        `Added ${accepted.length} file(s). ${skippedCount} skipped.`,
      );
    }
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (selected.length > 0) addFiles(selected);
    },
    [addFiles],
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles((current) => current.filter((entry) => entry.id !== fileId));
  }, []);

  const updateTags = useCallback((fileId: string, tags: string[]) => {
    setFiles((current) =>
      current.map((entry) =>
        entry.id === fileId ? { ...entry, tags } : entry,
      ),
    );
  }, []);

  const toggleBookmark = useCallback((fileId: string) => {
    setFiles((current) =>
      current.map((entry) =>
        entry.id === fileId
          ? { ...entry, isBookmarked: !entry.isBookmarked }
          : entry,
      ),
    );
  }, []);

  const openReplacePicker = useCallback((fileId: string) => {
    replaceTargetIdRef.current = fileId;
    replaceInputRef.current?.click();
  }, []);

  const handleReplaceInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      const fileId = replaceTargetIdRef.current;
      replaceTargetIdRef.current = null;

      if (!file || !fileId) {
        return;
      }

      const result = validateFileForUpload(file);
      if (!result.ok) {
        setError(result.reason);
        return;
      }

      setError(null);
      setFiles((current) =>
        current.map((entry) =>
          entry.id === fileId
            ? {
                ...entry,
                file,
                fileType: result.fileType,
              }
            : entry,
        ),
      );
    },
    [],
  );

  return {
    files,
    error,
    openFilePicker,
    removeFile,
    updateTags,
    toggleBookmark,
    openReplacePicker,
    inputRef,
    replaceInputRef,
    inputProps: {
      type: "file" as const,
      multiple: true,
      accept: ACCEPT_ATTRIBUTE,
      className: "sr-only",
      onChange: handleInputChange,
    },
    replaceInputProps: {
      type: "file" as const,
      accept: ACCEPT_ATTRIBUTE,
      className: "sr-only",
      onChange: handleReplaceInputChange,
    },
  };
}
