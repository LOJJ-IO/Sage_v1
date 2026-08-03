"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import {
  PdfScrollModePill,
  type PdfScrollMode,
} from "@/components/preview-tabs/viewers/pdf-scroll-mode-pill";
import { Button } from "@/components/ui/button";
import type { ViewState } from "@/lib/preview-tabs/types";
import { cn } from "@/lib/utils";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const DEFAULT_ZOOM = 1;
const DEFAULT_PAGE = 1;
const DEFAULT_SCROLL_MODE: PdfScrollMode = "single";
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

type PdfViewerProps = {
  /** Blob URL or Blob — react-pdf accepts both. */
  file: string | Blob;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

export function PdfViewer({ file, viewState, onViewStateChange }: PdfViewerProps) {
  const page = viewState.page ?? DEFAULT_PAGE;
  const zoom = viewState.zoom ?? DEFAULT_ZOOM;
  const scrollMode = viewState.scrollMode ?? DEFAULT_SCROLL_MODE;
  const [numPages, setNumPages] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
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
  }, [viewState.scrollTop, numPages, scrollMode]);

  function setZoom(next: number) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    onViewStateChange({ zoom: clamped });
  }

  function setPage(next: number) {
    if (numPages === 0) {
      return;
    }
    const clamped = Math.min(numPages, Math.max(1, next));
    onViewStateChange({ page: clamped, scrollTop: 0 });
    if (scrollMode === "single") {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
      return;
    }
    requestAnimationFrame(() => {
      pageRefs.current.get(clamped)?.scrollIntoView({ block: "start" });
    });
  }

  function setScrollMode(next: PdfScrollMode) {
    if (next === scrollMode) {
      return;
    }
    onViewStateChange({
      scrollMode: next,
      scrollTop: next === "single" ? 0 : viewState.scrollTop,
    });
    restoredScroll.current = next === "continuous" ? false : true;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
        <Button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <IconChevronLeft aria-hidden className="size-3.5" stroke={2.2} />
        </Button>
        <span className="min-w-16 text-center text-xs text-muted-foreground">
          {page}
          {numPages > 0 ? ` / ${numPages}` : ""}
        </span>
        <Button
          aria-label="Next page"
          disabled={numPages === 0 || page >= numPages}
          onClick={() => setPage(page + 1)}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <IconChevronRight aria-hidden className="size-3.5" stroke={2.2} />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
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
        <div className="mx-1 h-4 w-px bg-border" />
        <PdfScrollModePill onChange={setScrollMode} value={scrollMode} />
      </div>
      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-auto bg-muted/30 p-4",
          scrollMode === "continuous" ? "flex-col items-center gap-4" : "justify-center",
        )}
        onScroll={(event) => {
          onViewStateChange({ scrollTop: event.currentTarget.scrollTop });
        }}
        ref={scrollRef}
      >
        <Document
          className={cn(
            "flex",
            scrollMode === "continuous" ? "flex-col items-center gap-4" : "justify-center",
          )}
          file={file}
          loading={
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
            </div>
          }
          onLoadSuccess={({ numPages: nextNumPages }) => {
            setNumPages(nextNumPages);
            if (page > nextNumPages) {
              onViewStateChange({ page: nextNumPages });
            }
          }}
        >
          {scrollMode === "continuous" && numPages > 0
            ? Array.from({ length: numPages }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <div
                    key={pageNumber}
                    ref={(node) => {
                      if (node) {
                        pageRefs.current.set(pageNumber, node);
                      } else {
                        pageRefs.current.delete(pageNumber);
                      }
                    }}
                  >
                    <Page pageNumber={pageNumber} scale={zoom} />
                  </div>
                );
              })
            : (
              <Page
                pageNumber={Math.min(page, Math.max(1, numPages || 1))}
                scale={zoom}
              />
            )}
        </Document>
      </div>
    </div>
  );
}
