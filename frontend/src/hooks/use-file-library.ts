"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { ApiError } from "@/lib/api/client";
import {
  deleteBackendFile,
  isBackendConfigured,
  listBackendFiles,
  replaceBackendFile,
  uploadBackendFile,
  type FileRecord,
} from "@/lib/files/api";
import {
  ACCEPT_ATTRIBUTE,
  fileTypeFromFilename,
  isSystemJunkFile,
  tagsFromFilename,
  validateFileForUpload,
  type LibraryFile,
} from "@/lib/file-upload";

const POLL_INTERVAL_MS = 2000;

type PriorFileInfo = Pick<LibraryFile, "file" | "tags" | "isBookmarked">;

function toLibraryFile(record: FileRecord, prior?: PriorFileInfo): LibraryFile {
  return {
    id: record.file_id,
    file: prior?.file ?? new File([], record.filename),
    fileType: fileTypeFromFilename(record.filename),
    tags: prior?.tags ?? tagsFromFilename(record.filename),
    isBookmarked: prior?.isBookmarked ?? false,
    status: record.status,
    looksScanned: record.looks_scanned,
    error: record.error,
  };
}

function mergeRecords(
  records: FileRecord[],
  previous: LibraryFile[],
): LibraryFile[] {
  const priorById = new Map(previous.map((entry) => [entry.id, entry]));
  return records.map((record) => toLibraryFile(record, priorById.get(record.file_id)));
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useFileLibrary() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIdRef = useRef<string | null>(null);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const backendConfigured = isBackendConfigured();
  const filesRef = useRef<LibraryFile[]>([]);
  const notifiedScannedIdsRef = useRef<Set<string>>(new Set());
  const hasNotifiedLoadErrorRef = useRef(false);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const notifyScannedFiles = useCallback(
    (entries: LibraryFile[]) => {
      for (const entry of entries) {
        if (
          entry.looksScanned &&
          entry.status === "indexed" &&
          !notifiedScannedIdsRef.current.has(entry.id)
        ) {
          notifiedScannedIdsRef.current.add(entry.id);
          toast.warning({
            title: "OCR is off",
            description: `"${entry.file.name}" looks scanned — images and handwritten text may be lost, so Sage might not be able to answer questions about it.`,
          });
        }
      }
    },
    [toast]
  );

  const refreshFromBackend = useCallback(async () => {
    if (!backendConfigured) return;
    try {
      const records = await listBackendFiles();
      const merged = mergeRecords(records, filesRef.current);
      notifyScannedFiles(merged);
      setFiles(merged);
      hasNotifiedLoadErrorRef.current = false;
    } catch (err) {
      // Guarded so a prolonged outage (this runs on a 2s poll) toasts once,
      // not every tick — it resets as soon as a load succeeds again.
      if (!hasNotifiedLoadErrorRef.current) {
        hasNotifiedLoadErrorRef.current = true;
        toast.error({
          title: "Couldn't load files",
          description: errorMessage(err, "Try refreshing."),
        });
      }
    }
  }, [backendConfigured, notifyScannedFiles, toast]);

  useEffect(() => {
    void refreshFromBackend();
  }, [refreshFromBackend]);

  useEffect(() => {
    if (!backendConfigured) return;
    const hasInFlightIngestion = files.some(
      (entry) => entry.status === "pending" || entry.status === "processing",
    );
    if (!hasInFlightIngestion) return;

    const timer = setInterval(() => {
      void refreshFromBackend();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [backendConfigured, files, refreshFromBackend]);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const addFiles = useCallback(
    async (selected: File[]) => {
      const accepted: File[] = [];
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

        accepted.push(file);
      }

      if (accepted.length === 0) {
        toast.warning({
          title: "No files uploaded",
          description: firstSkipReason ?? "No supported files selected.",
        });
        return;
      }

      const uploadFailures: string[] = [];
      for (const file of accepted) {
        if (!backendConfigured) {
          // No backend configured — keep the old in-memory-only prototype
          // behavior so the UI still works standalone.
          setFiles((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              file,
              fileType: fileTypeFromFilename(file.name),
              tags: tagsFromFilename(file.name),
              isBookmarked: false,
              status: "indexed",
              looksScanned: false,
              error: null,
            },
          ]);
          continue;
        }

        try {
          const record = await uploadBackendFile(file);
          setFiles((current) => [...current, toLibraryFile(record, { file, tags: tagsFromFilename(file.name), isBookmarked: false })]);
        } catch (err) {
          uploadFailures.push(`${file.name}: ${errorMessage(err, "upload failed")}`);
        }
      }

      if (uploadFailures.length > 0) {
        toast.warning({
          title: "Some files failed to upload",
          description: uploadFailures.join("; "),
        });
      } else if (skippedCount > 0) {
        toast.warning({
          title: `Uploaded ${accepted.length} file(s)`,
          description: `${skippedCount} skipped.`,
        });
      }
    },
    [backendConfigured, toast],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (selected.length > 0) void addFiles(selected);
    },
    [addFiles],
  );

  const removeFile = useCallback((fileId: string) => {
    const previous = files;
    setFiles((current) => current.filter((entry) => entry.id !== fileId));

    if (!backendConfigured) return;

    void deleteBackendFile(fileId).catch((err) => {
      toast.error({
        title: "Couldn't delete file",
        description: errorMessage(err, "Try again."),
      });
      setFiles(previous);
    });
  }, [backendConfigured, files, toast]);

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
        toast.warning({ title: "Couldn't replace file", description: result.reason });
        return;
      }

      if (!backendConfigured) {
        setFiles((current) =>
          current.map((entry) =>
            entry.id === fileId
              ? { ...entry, file, fileType: fileTypeFromFilename(file.name) }
              : entry,
          ),
        );
        return;
      }

      void replaceBackendFile(fileId, file)
        .then((record) => {
          setFiles((current) =>
            current.map((entry) =>
              entry.id === fileId ? toLibraryFile(record, { ...entry, file }) : entry,
            ),
          );
        })
        .catch((err) => {
          toast.error({
            title: "Couldn't replace file",
            description: errorMessage(err, "Try again."),
          });
        });
    },
    [backendConfigured, toast],
  );

  return {
    files,
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
