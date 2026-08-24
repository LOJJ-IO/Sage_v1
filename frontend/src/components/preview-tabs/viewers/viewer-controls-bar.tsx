"use client";

import { IconChevronLeft, IconChevronRight, IconMaximize } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

const DEFAULT_ZOOM_STEP = 0.25;
const DEFAULT_MIN_ZOOM = 0.5;
const DEFAULT_MAX_ZOOM = 3;

type PageNav = {
  page: number;
  numPages: number;
  onPageChange: (next: number) => void;
};

type ViewerControlsBarProps = {
  zoom: number;
  onZoomChange: (next: number) => void;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  onFitToPage?: () => void;
  canFitToPage?: boolean;
  /** Omit entirely for viewers with no discrete pages (flowing docx/md HTML) — PDF is currently the only caller that passes this. */
  pageNav?: PageNav;
  /** Viewer-specific extras (scroll-mode pill, raw/rendered toggle, ...) at the trailing edge. */
  trailing?: ReactNode;
  /** Greys out zoom/fit/page-nav without removing them — keeps `trailing`
   * (e.g. a raw/rendered toggle) at a fixed position regardless of which
   * mode is active, instead of the bar's shape changing between modes. */
  disabled?: boolean;
};

/** Shared zoom/fit-to-page/page-nav toolbar, extracted from what used to be
 * `PdfViewer`-only inline JSX so the docx viewer can reuse the same controls
 * instead of a second hand-rolled copy. */
export function ViewerControlsBar({
  zoom,
  onZoomChange,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  zoomStep = DEFAULT_ZOOM_STEP,
  onFitToPage,
  canFitToPage = false,
  pageNav,
  trailing,
  disabled = false,
}: ViewerControlsBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
      {pageNav ? (
        <>
          <Button
            aria-label="Previous page"
            disabled={disabled || pageNav.page <= 1}
            onClick={() => pageNav.onPageChange(pageNav.page - 1)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <IconChevronLeft aria-hidden className="size-3.5" stroke={2.2} />
          </Button>
          <span className="min-w-16 text-center text-xs text-muted-foreground">
            {pageNav.page}
            {pageNav.numPages > 0 ? ` / ${pageNav.numPages}` : ""}
          </span>
          <Button
            aria-label="Next page"
            disabled={disabled || pageNav.numPages === 0 || pageNav.page >= pageNav.numPages}
            onClick={() => pageNav.onPageChange(pageNav.page + 1)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <IconChevronRight aria-hidden className="size-3.5" stroke={2.2} />
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
        </>
      ) : null}

      <Button
        aria-label="Zoom out"
        disabled={disabled || zoom <= minZoom}
        onClick={() => onZoomChange(Math.max(minZoom, zoom - zoomStep))}
        size="xs"
        type="button"
        variant="ghost"
      >
        −
      </Button>
      <span className="min-w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
      <Button
        aria-label="Zoom in"
        disabled={disabled || zoom >= maxZoom}
        onClick={() => onZoomChange(Math.min(maxZoom, zoom + zoomStep))}
        size="xs"
        type="button"
        variant="ghost"
      >
        +
      </Button>

      {onFitToPage ? (
        <Button
          aria-label="Fit to page"
          disabled={disabled || !canFitToPage}
          onClick={onFitToPage}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <IconMaximize aria-hidden className="size-3.5" stroke={2.2} />
        </Button>
      ) : null}

      {trailing ? (
        <>
          <div className="mx-1 h-4 w-px bg-border" />
          {trailing}
        </>
      ) : null}
    </div>
  );
}
