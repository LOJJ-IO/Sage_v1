"use client";

import { useCallback, useRef, useState } from "react";
import {
  ACCEPT_ATTRIBUTE,
  isSystemJunkFile,
  validateFileForUpload,
  type LibraryFile,
} from "@/lib/file-upload";

export function useFileLibrary() {
  const inputRef = useRef<HTMLInputElement>(null);
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

  return {
    files,
    error,
    openFilePicker,
    inputRef,
    inputProps: {
      type: "file" as const,
      multiple: true,
      accept: ACCEPT_ATTRIBUTE,
      className: "sr-only",
      onChange: handleInputChange,
    },
  };
}
