"use client";

import { useEffect } from "react";

import type { LibraryFile } from "@/lib/file-upload";
import { getResourceKeysToMarkRemoved } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";

/**
 * Diffs the file library against open preview tabs on every `files` change
 * (upload, delete, or the 2s ingestion poll) and marks any tab whose
 * resource has disappeared as `removed`, instead of leaving it pointing at
 * a file that no longer exists.
 */
export function useSyncRemovedPreviewTabs(files: LibraryFile[]) {
  const tabs = usePreviewTabsStore((state) => state.tabs);
  const markResourceRemoved = usePreviewTabsStore((state) => state.markResourceRemoved);

  useEffect(() => {
    const presentResourceKeys = new Set(files.map((file) => file.id));
    for (const resourceKey of getResourceKeysToMarkRemoved(tabs, presentResourceKeys)) {
      markResourceRemoved(resourceKey);
    }
  }, [files, tabs, markResourceRemoved]);
}
