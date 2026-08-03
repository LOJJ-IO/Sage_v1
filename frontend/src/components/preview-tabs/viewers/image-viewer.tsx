"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { ViewState } from "@/lib/preview-tabs/types";

const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

type ImageViewerProps = {
  blobUrl: string;
  title: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

export function ImageViewer({
  blobUrl,
  title,
  viewState,
  onViewStateChange,
}: ImageViewerProps) {
  const zoom = viewState.zoom ?? DEFAULT_ZOOM;
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

  function setZoom(next: number) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    onViewStateChange({ zoom: clamped });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
        <Button
          aria-label="Zoom out"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => setZoom(zoom - ZOOM_STEP)}
          size="xs"
          type="button"
          variant="ghost"
        >
          −
        </Button>
        <span className="min-w-12 text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => setZoom(zoom + ZOOM_STEP)}
          size="xs"
          type="button"
          variant="ghost"
        >
          +
        </Button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-auto"
        onScroll={(event) => {
          onViewStateChange({ scrollTop: event.currentTarget.scrollTop });
        }}
        ref={scrollRef}
      >
        <div className="flex min-h-full items-start justify-center p-4">
          {/* Blob URL from authenticated download — next/image cannot use opaque blobs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={title}
            className="max-w-none origin-top"
            src={blobUrl}
            style={{ width: `${zoom * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
