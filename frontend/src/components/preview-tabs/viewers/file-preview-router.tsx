"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { DocxMarkdownViewer } from "@/components/preview-tabs/viewers/docx-markdown-viewer";
import { DocxTextViewer } from "@/components/preview-tabs/viewers/docx-text-viewer";
import { ImageViewer } from "@/components/preview-tabs/viewers/image-viewer";
import {
  PreviewFetchError,
  PreviewLoadingSkeleton,
} from "@/components/preview-tabs/viewers/preview-status";
import { TextViewer } from "@/components/preview-tabs/viewers/text-viewer";
import { useDebouncedViewState } from "@/components/preview-tabs/viewers/use-debounced-view-state";
import { usePreviewFileContent } from "@/components/preview-tabs/viewers/use-preview-file-content";
import type { PreviewTab } from "@/lib/preview-tabs/types";

const PdfViewer = dynamic(
  () =>
    import("@/components/preview-tabs/viewers/pdf-viewer").then(
      (mod) => mod.PdfViewer,
    ),
  {
    ssr: false,
    loading: () => <PreviewLoadingSkeleton />,
  },
);

type FilePreviewRouterProps = {
  tab: PreviewTab;
  /** In-memory File from the library when present (standalone mode / post-upload). */
  localFile?: File | null;
};

export function FilePreviewRouter({ tab, localFile }: FilePreviewRouterProps) {
  const content = usePreviewFileContent(tab.resourceKey, tab.fileType, localFile);
  const { viewState, patchViewState } = useDebouncedViewState(
    tab.tabId,
    tab.viewState,
  );

  if (content.status === "loading") {
    return <PreviewLoadingSkeleton />;
  }

  if (content.status === "error") {
    return <PreviewFetchError message={content.message} />;
  }

  if (tab.fileType === "pdf" && content.kind === "blob") {
    return (
      <PdfViewer
        file={content.blob}
        onViewStateChange={patchViewState}
        viewState={viewState}
      />
    );
  }

  if (tab.fileType === "image" && content.kind === "blob") {
    return (
      <ImageViewer
        blobUrl={content.blobUrl}
        onViewStateChange={patchViewState}
        title={tab.title}
        viewState={viewState}
      />
    );
  }

  if (
    (tab.fileType === "txt" || tab.fileType === "md") &&
    content.kind === "blob"
  ) {
    return (
      <BlobTextPreview
        blob={content.blob}
        onViewStateChange={patchViewState}
        viewState={viewState}
      />
    );
  }

  if (tab.fileType === "docx" && content.kind === "markdown") {
    return (
      <DocxMarkdownViewer
        markdown={content.markdown}
        onViewStateChange={patchViewState}
        viewState={viewState}
      />
    );
  }

  if (tab.fileType === "docx" && content.kind === "text") {
    return (
      <DocxTextViewer
        onViewStateChange={patchViewState}
        text={content.text}
        viewState={viewState}
      />
    );
  }

  return (
    <PreviewFetchError message="This file type cannot be previewed yet." />
  );
}

/** Decode a text blob once for txt/md viewers. */
function BlobTextPreview({
  blob,
  viewState,
  onViewStateChange,
}: {
  blob: Blob;
  viewState: PreviewTab["viewState"];
  onViewStateChange: (partial: Partial<PreviewTab["viewState"]>) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void blob
      .text()
      .then((value) => {
        if (!cancelled) {
          setText(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to decode text file.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  if (error) {
    return <PreviewFetchError message={error} />;
  }
  if (text === null) {
    return <PreviewLoadingSkeleton />;
  }
  return (
    <TextViewer
      onViewStateChange={onViewStateChange}
      text={text}
      viewState={viewState}
    />
  );
}
