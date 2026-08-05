"use client";

import { useEffect, useRef, useState } from "react";

import type { ViewState } from "@/lib/preview-tabs/types";

type TextViewerProps = {
  text: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
  emptyMessage?: string;
};

type HighlightRange = { charStart: number; charEnd: number };

export function TextViewer({
  text,
  viewState,
  onViewStateChange,
  emptyMessage = "This file has no text content.",
}: TextViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLElement>(null);
  const restoredScroll = useRef(false);
  const [highlightRange, setHighlightRange] = useState<HighlightRange | null>(
    null,
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || restoredScroll.current) {
      return;
    }
    if (typeof viewState.scrollTop === "number") {
      el.scrollTop = viewState.scrollTop;
    }
    restoredScroll.current = true;
  }, [viewState.scrollTop]);

  // Consume a citation jump target once, then clear it from the tab's stored
  // viewState (so reopening this tab later doesn't re-trigger the same scroll)
  // while keeping the visual <mark> up via local state.
  useEffect(() => {
    const highlight = viewState.highlight;
    if (!highlight) {
      return;
    }
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }
      setHighlightRange({ charStart: highlight.charStart, charEnd: highlight.charEnd });
      onViewStateChange({ highlight: null });
    });
    return () => {
      cancelled = true;
    };
  }, [viewState.highlight, onViewStateChange]);

  useEffect(() => {
    if (!highlightRange) {
      return;
    }
    markRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightRange]);

  if (!text.trim()) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const validRange =
    highlightRange &&
    highlightRange.charStart >= 0 &&
    highlightRange.charEnd > highlightRange.charStart &&
    highlightRange.charEnd <= text.length;

  return (
    <div
      className="h-full min-h-0 overflow-auto p-4"
      onScroll={(event) => {
        onViewStateChange({ scrollTop: event.currentTarget.scrollTop });
      }}
      ref={scrollRef}
    >
      <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
        {validRange ? (
          <>
            {text.slice(0, highlightRange.charStart)}
            <mark
              className="rounded bg-yellow-200 text-foreground dark:bg-yellow-500/40"
              ref={markRef}
            >
              {text.slice(highlightRange.charStart, highlightRange.charEnd)}
            </mark>
            {text.slice(highlightRange.charEnd)}
          </>
        ) : (
          text
        )}
      </pre>
    </div>
  );
}
