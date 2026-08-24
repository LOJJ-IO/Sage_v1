"use client";

import { useEffect, useState } from "react";

import { DocxMammothContent } from "@/components/preview-tabs/viewers/docx-mammoth-content";
import { DocxTextViewer } from "@/components/preview-tabs/viewers/docx-text-viewer";
import { SourceModeToggle } from "@/components/preview-tabs/viewers/source-mode-toggle";
import { ViewerControlsBar } from "@/components/preview-tabs/viewers/viewer-controls-bar";
import { fetchBackendFileText, isBackendConfigured } from "@/lib/files/api";
import type { ViewState } from "@/lib/preview-tabs/types";

const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

type RawTextState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; text: string }
  | { status: "error"; message: string };

/** Lazy — only fetched once "raw" mode is actually selected, since the
 * default "rendered" mode never needs the server-extracted RAG text. */
function useDocxRawText(resourceKey: string, enabled: boolean): RawTextState {
  const [state, setState] = useState<RawTextState>({ status: "idle" });

  useEffect(() => {
    if (!enabled || state.status === "ready" || state.status === "loading") return;

    if (!isBackendConfigured()) {
      setState({ status: "error", message: "Raw text needs the backend connected." });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    fetchBackendFileText(resourceKey)
      .then((text) => {
        if (!cancelled) setState({ status: "ready", text });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load raw text.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // Re-running only on resourceKey/enabled change is deliberate — `state`
    // itself changing must not retrigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey, enabled]);

  return state;
}

type DocxViewerProps = {
  resourceKey: string;
  blob: Blob;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

export function DocxViewer({ resourceKey, blob, viewState, onViewStateChange }: DocxViewerProps) {
  const sourceMode = viewState.sourceMode ?? "rendered";
  const zoom = viewState.zoom ?? DEFAULT_ZOOM;

  // A citation click's char offsets only resolve against the raw extracted
  // text — force raw mode so the highlight is actually visible, even if the
  // tab was last left in "rendered". Clears itself once TextViewer consumes
  // `viewState.highlight` (sets it back to null), same one-shot pattern.
  useEffect(() => {
    if (viewState.highlight && sourceMode !== "raw") {
      onViewStateChange({ sourceMode: "raw" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState.highlight]);

  const rawText = useDocxRawText(resourceKey, sourceMode === "raw");

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Same bar in both modes — only its enabled-ness changes — so the
          source-mode toggle never shifts position when switching modes. */}
      <ViewerControlsBar
        disabled={sourceMode !== "rendered"}
        maxZoom={MAX_ZOOM}
        minZoom={MIN_ZOOM}
        onZoomChange={(next) => onViewStateChange({ zoom: next })}
        trailing={<SourceModeToggle onChange={(mode) => onViewStateChange({ sourceMode: mode })} value={sourceMode} />}
        zoom={zoom}
        zoomStep={ZOOM_STEP}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        {sourceMode === "rendered" ? (
          <div className="h-full overflow-auto bg-muted/30 p-4">
            <DocxMammothContent blob={blob} zoom={zoom} />
          </div>
        ) : rawText.status === "ready" ? (
          <DocxTextViewer onViewStateChange={onViewStateChange} text={rawText.text} viewState={viewState} />
        ) : rawText.status === "error" ? (
          <div className="flex h-full items-center justify-center px-4 text-sm text-destructive">
            {rawText.message}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8">
            <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
          </div>
        )}
      </div>
    </div>
  );
}
