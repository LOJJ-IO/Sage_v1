"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { DocxViewer } from "@/components/preview-tabs/viewers/docx-viewer";
import { ImageViewer } from "@/components/preview-tabs/viewers/image-viewer";
import { MdViewer } from "@/components/preview-tabs/viewers/md-viewer";
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

  if (tab.fileType === "pdf") {
    return (
      <PdfViewer
        file={content.blob}
        onViewStateChange={patchViewState}
        viewState={viewState}
      />
    );
  }

  if (tab.fileType === "image") {
    return (
      <ImageViewer
        blobUrl={content.blobUrl}
        onViewStateChange={patchViewState}
        title={tab.title}
        viewState={viewState}
      />
    );
  }

  if (tab.fileType === "docx") {
    return (
      <DocxViewer
        blob={content.blob}
        onViewStateChange={patchViewState}
        resourceKey={tab.resourceKey}
        viewState={viewState}
      />
    );
  }

  if (tab.fileType === "txt") {
    return (
      <BlobTextPreview blob={content.blob} onViewStateChange={patchViewState} viewState={viewState} />
    );
  }

  if (tab.fileType === "md") {
    return (
      <BlobTextPreview
        blob={content.blob}
        onViewStateChange={patchViewState}
        renderer="md"
        viewState={viewState}
      />
    );
  }

  return (
    <PreviewFetchError message="This file type cannot be previewed yet." />
  );
}

/** Decode a text blob once, then hand off to either the plain `TextViewer`
 * (.txt) or `MdViewer` (.md, adds the raw/rendered toggle). */
function BlobTextPreview({
  blob,
  viewState,
  onViewStateChange,
  renderer = "txt",
}: {
  blob: Blob;
  viewState: PreviewTab["viewState"];
  onViewStateChange: (partial: Partial<PreviewTab["viewState"]>) => void;
  renderer?: "txt" | "md";
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
  if (renderer === "md") {
    return <MdViewer onViewStateChange={onViewStateChange} text={text} viewState={viewState} />;
  }
  return (
    <TextViewer
      onViewStateChange={onViewStateChange}
      text={text}
      viewState={viewState}
    />
  );
}
