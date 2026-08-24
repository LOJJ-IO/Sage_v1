"use client";

import { useEffect } from "react";

import { MarkdownViewer } from "@/components/preview-tabs/viewers/markdown-viewer";
import { SourceModeToggle } from "@/components/preview-tabs/viewers/source-mode-toggle";
import { TextViewer } from "@/components/preview-tabs/viewers/text-viewer";
import type { ViewState } from "@/lib/preview-tabs/types";

type MdViewerProps = {
  text: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

/** Raw/rendered toggle for .md — "rendered" (default) is `react-markdown`;
 * "raw" is the plain-source `TextViewer`, and the only mode that supports
 * citation-highlight char offsets (same constraint as `DocxViewer`). */
export function MdViewer({ text, viewState, onViewStateChange }: MdViewerProps) {
  const sourceMode = viewState.sourceMode ?? "rendered";

  useEffect(() => {
    if (viewState.highlight && sourceMode !== "raw") {
      onViewStateChange({ sourceMode: "raw" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState.highlight]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-end gap-1 border-b border-border px-2 py-1">
        <SourceModeToggle onChange={(mode) => onViewStateChange({ sourceMode: mode })} value={sourceMode} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {sourceMode === "rendered" ? (
          <MarkdownViewer markdown={text} onViewStateChange={onViewStateChange} viewState={viewState} />
        ) : (
          <TextViewer onViewStateChange={onViewStateChange} text={text} viewState={viewState} />
        )}
      </div>
    </div>
  );
}
