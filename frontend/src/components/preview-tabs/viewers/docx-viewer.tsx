"use client";

import { useEffect, useRef, useState } from "react";

import {
  PreviewFetchError,
  PreviewLoadingSkeleton,
} from "@/components/preview-tabs/viewers/preview-status";
import { TextViewer } from "@/components/preview-tabs/viewers/text-viewer";
import { fetchBackendFileText } from "@/lib/files/api";
import type { ViewState } from "@/lib/preview-tabs/types";

type DocxViewerProps = {
  blob: Blob;
  /** Backend file id — used for the `/text` fallback when rendering fails. */
  resourceKey: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

/** Side padding (px) kept around the page when scaling it to the panel. */
const FIT_GUTTER = 32;

/** Scale the rendered pages down so a Letter/A4 page fits a narrow panel. */
function fitToWidth(host: HTMLElement, body: HTMLElement) {
  const wrapper = body.querySelector<HTMLElement>(".docx-wrapper");
  const page = body.querySelector<HTMLElement>("section.docx");
  if (!wrapper || !page) return;
  wrapper.style.zoom = "1";
  const scale = Math.min(1, (host.clientWidth - FIT_GUTTER) / page.offsetWidth);
  wrapper.style.zoom = String(Math.max(scale, 0.3));
}

type RenderState =
  | { status: "rendering" }
  | { status: "rendered" }
  | { status: "fallback"; text: string }
  | { status: "error"; message: string };

/**
 * Renders a .docx with its real layout (headings, tables, shading) via
 * docx-preview. If the bytes can't be rendered — or a staff account can't
 * download the original — shows the backend's extracted text instead.
 */
export function DocxViewer({ blob, resourceKey, viewState, onViewStateChange }: DocxViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RenderState>({ status: "rendering" });

  useEffect(() => {
    let cancelled = false;
    const body = bodyRef.current;
    if (!body) return;

    void (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        await renderAsync(blob, body, undefined, {
          className: "docx",
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
        });
        if (cancelled) return;
        setState({ status: "rendered" });
        const el = scrollRef.current;
        if (el) fitToWidth(el, body);
        if (el && typeof viewState.scrollTop === "number") {
          el.scrollTop = viewState.scrollTop;
        }
      } catch {
        try {
          const text = await fetchBackendFileText(resourceKey);
          if (!cancelled) setState({ status: "fallback", text });
        } catch {
          if (!cancelled) setState({ status: "error", message: "Couldn't render this Word document." });
        }
      }
    })();

    const host = scrollRef.current;
    const observer = new ResizeObserver(() => {
      if (host) fitToWidth(host, body);
    });
    if (host) observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
      body.replaceChildren();
    };
    // viewState.scrollTop is only restored once per render of the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob, resourceKey]);

  if (state.status === "fallback") {
    return (
      <TextViewer
        emptyMessage="No extracted text yet — the file may still be ingesting, or extraction found nothing."
        onViewStateChange={onViewStateChange}
        text={state.text}
        viewState={viewState}
      />
    );
  }

  if (state.status === "error") {
    return <PreviewFetchError message={state.message} />;
  }

  return (
    <div
      className="docx-preview-host relative h-full min-h-0 overflow-auto bg-muted"
      onScroll={(event) => onViewStateChange({ scrollTop: event.currentTarget.scrollTop })}
      ref={scrollRef}
    >
      {state.status === "rendering" ? (
        <div className="absolute inset-0">
          <PreviewLoadingSkeleton />
        </div>
      ) : null}
      <div ref={bodyRef} />
    </div>
  );
}
