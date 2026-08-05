"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ViewState } from "@/lib/preview-tabs/types";

/** No rehype-raw: raw HTML in a doc renders as literal text, never executes. */
const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="mt-6 mb-3 font-heading text-xl font-semibold text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 mb-2 font-heading text-lg font-semibold text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 font-heading text-base font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-relaxed text-foreground last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a
      className="underline underline-offset-2 hover:no-underline"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-border" />,
  // Spreadsheet-style table chrome: bordered cells, shaded header, zebra rows.
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  tr: ({ children }) => (
    <tr className="border-b border-border last:border-b-0 odd:bg-transparent even:bg-muted/30">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="border-r border-border px-3 py-2 text-left font-semibold whitespace-nowrap text-foreground last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-r border-border px-3 py-2 align-top text-foreground last:border-r-0">
      {children}
    </td>
  ),
};

type DocxMarkdownViewerProps = {
  markdown: string;
  viewState: ViewState;
  onViewStateChange: (partial: Partial<ViewState>) => void;
};

export function DocxMarkdownViewer({
  markdown,
  viewState,
  onViewStateChange,
}: DocxMarkdownViewerProps) {
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

  if (!markdown.trim()) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        This file has no previewable content.
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
      <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={[remarkGfm]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
