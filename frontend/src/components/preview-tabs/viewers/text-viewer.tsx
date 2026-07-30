"use client";

import { useEffect, useRef } from "react";

import type { ViewState } from "@/lib/preview-tabs/types";

type TextViewerProps = {
  text: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
  emptyMessage?: string;
};

export function TextViewer({
  text,
  viewState,
  onViewStateChange,
  emptyMessage = "This file has no text content.",
}: TextViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredScroll = useRef(false);

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

  if (!text.trim()) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="h-full min-h-0 overflow-auto p-4"
      onScroll={(event) => {
        onViewStateChange({ scrollTop: event.currentTarget.scrollTop });
      }}
      ref={scrollRef}
    >
      <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
        {text}
      </pre>
    </div>
  );
}
