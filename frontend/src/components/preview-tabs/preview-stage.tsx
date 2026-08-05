"use client";

import { IconAlertTriangle, IconFile } from "@tabler/icons-react";

import { FilePreviewRouter } from "@/components/preview-tabs/viewers/file-preview-router";
import { EmptyState } from "@/components/ui/empty";
import type { PreviewTab } from "@/lib/preview-tabs/types";

const ICON_SIZE_EMPTY = 16;

type PreviewStageProps = {
  activeTab: PreviewTab | null;
  hasTabs: boolean;
  filesEmpty?: boolean;
  /** In-memory File from the library when present (standalone mode / post-upload). */
  localFile?: File | null;
};

export function PreviewStage({
  activeTab,
  hasTabs,
  filesEmpty,
  localFile,
}: PreviewStageProps) {
  if (!hasTabs || !activeTab) {
    return (
      <EmptyState
        className="h-full px-4"
        description={
          filesEmpty
            ? "Upload documents, then click one in the left panel to preview it here."
            : "Select a file in the left panel to preview it here."
        }
        icon={<IconFile aria-hidden size={ICON_SIZE_EMPTY} stroke={2.2} />}
        title={filesEmpty ? "No files yet" : "Nothing open"}
      />
    );
  }

  if (activeTab.lifecycle === "removed" || activeTab.lifecycle === "error") {
    return (
      <EmptyState
        className="h-full px-4"
        description={
          activeTab.errorMessage ?? "This file is no longer available."
        }
        icon={
          <IconAlertTriangle aria-hidden size={ICON_SIZE_EMPTY} stroke={2.2} />
        }
        mediaClassName="bg-destructive/10 text-destructive"
        title="File could not be previewed"
      />
    );
  }

  if (activeTab.lifecycle === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
        <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    // Keyed by tabId (not just resourceKey) so two duplicate tabs of the same
    // file get fully independent viewer instances — otherwise switching between
    // them reuses the same mounted PdfViewer/scroll DOM node and one tab's
    // scroll position silently becomes "shared" with the other.
    <FilePreviewRouter key={activeTab.tabId} localFile={localFile ?? null} tab={activeTab} />
  );
}
