"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import mammoth from "mammoth";

import { cn } from "@/lib/utils";

/** Mirrors `markdown-viewer.tsx`'s heading/table/list styling so docx and md
 * "rendered" previews look consistent with each other. mammoth's output is a
 * constrained HTML subset from real docx structure, but it's still rendered
 * via dangerouslySetInnerHTML from an uploaded file — DOMPurify sanitizes
 * before render as defense-in-depth, not because mammoth is known-unsafe. */
const MAMMOTH_CONTENT_CLASS = cn(
  "text-sm leading-relaxed text-foreground",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:font-heading [&_h1]:text-xl [&_h1]:font-semibold first:[&_h1]:mt-0",
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold",
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-heading [&_h3]:text-base [&_h3]:font-semibold",
  "[&_p]:mb-3 last:[&_p]:mb-0",
  "[&_strong]:font-semibold",
  "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
  "[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
  "[&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:no-underline",
  "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold",
  "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
  "[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-md",
);

type ConversionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; html: string };

/** Converts raw .docx bytes to sanitized HTML once per blob — mammoth runs
 * entirely client-side, no server round trip beyond the initial download. */
function useMammothHtml(blob: Blob): ConversionState {
  const [state, setState] = useState<ConversionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    blob
      .arrayBuffer()
      .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
      .then((result) => {
        if (cancelled) return;
        setState({ status: "ready", html: DOMPurify.sanitize(result.value) });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to render this document.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [blob]);

  return state;
}

type DocxMammothContentProps = {
  blob: Blob;
  zoom: number;
};

export function DocxMammothContent({ blob, zoom }: DocxMammothContentProps) {
  const state = useMammothHtml(blob);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-destructive">{state.message}</div>
    );
  }

  return (
    <div
      // Standard trick for CSS-scaling flowing HTML: transform:scale shrinks
      // the box visually without reflowing it, so the width is compensated
      // by the inverse factor to avoid a shrunken-and-then-clipped column.
      style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}
    >
      {/* eslint-disable-next-line react/no-danger -- sanitized above via DOMPurify */}
      <div className={MAMMOTH_CONTENT_CLASS} dangerouslySetInnerHTML={{ __html: state.html }} />
    </div>
  );
}
