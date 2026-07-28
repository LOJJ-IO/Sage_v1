"use client";

import { IconAlertTriangle, IconFile } from "@tabler/icons-react";

import { PreviewFileTypeIcon } from "@/components/preview-tabs/preview-file-type-icon";
import {
  PREVIEW_FILENAME_STAGE_MAX_CLASS,
  TruncatedFilename,
} from "@/components/preview-tabs/truncated-filename";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { PreviewTab } from "@/lib/preview-tabs/types";

const ICON_SIZE_EMPTY = 16;

type PreviewStageProps = {
  activeTab: PreviewTab | null;
  hasTabs: boolean;
  filesEmpty?: boolean;
};

export function PreviewStage({ activeTab, hasTabs, filesEmpty }: PreviewStageProps) {
  if (!hasTabs || !activeTab) {
    return (
      <Empty className="h-full border-none px-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconFile aria-hidden size={ICON_SIZE_EMPTY} stroke={2.2} />
          </EmptyMedia>
          <EmptyTitle>{filesEmpty ? "No files yet" : "Nothing open"}</EmptyTitle>
          <EmptyDescription>
            {filesEmpty
              ? "Upload documents, then click one in the left panel to preview it here."
              : "Select a file in the left panel to preview it here."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (activeTab.lifecycle === "removed" || activeTab.lifecycle === "error") {
    return (
      <Empty className="h-full border-none px-4">
        <EmptyHeader>
          <EmptyMedia className="bg-destructive/10 text-destructive" variant="icon">
            <IconAlertTriangle aria-hidden size={ICON_SIZE_EMPTY} stroke={2.2} />
          </EmptyMedia>
          <EmptyTitle>File could not be previewed</EmptyTitle>
          <EmptyDescription>
            {activeTab.errorMessage ?? "This file is no longer available."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
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
    <Empty className="h-full border-none px-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PreviewFileTypeIcon
            fileType={activeTab.fileType}
            size={ICON_SIZE_EMPTY}
            title={activeTab.title}
          />
        </EmptyMedia>
        <TruncatedFilename
          className="font-heading text-sm font-medium tracking-tight"
          maxWidthClass={PREVIEW_FILENAME_STAGE_MAX_CLASS}
          title={activeTab.title}
        />
        <EmptyDescription>Preview coming soon.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
