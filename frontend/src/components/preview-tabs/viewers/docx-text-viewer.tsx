"use client";

import { TextViewer } from "@/components/preview-tabs/viewers/text-viewer";
import type { ViewState } from "@/lib/preview-tabs/types";

type DocxTextViewerProps = {
  text: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

export function DocxTextViewer({
  text,
  viewState,
  onViewStateChange,
}: DocxTextViewerProps) {
  return (
    <TextViewer
      emptyMessage="No extracted text yet — the file may still be ingesting, or extraction found nothing."
      onViewStateChange={onViewStateChange}
      text={text}
      viewState={viewState}
    />
  );
}
