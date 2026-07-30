"use client";

import { PreviewFileTypeIcon } from "@/components/preview-tabs/preview-file-type-icon";
import type { AskCitation } from "@/lib/ask/api";
import {
  dedupeCitationsByFile,
  type CitationSource,
} from "@/lib/ask/citations";
import { fileTypeFromFilename } from "@/lib/file-upload";
import { cn } from "@/lib/utils";

export type { CitationSource };
export { dedupeCitationsByFile };

type CitationSourcesProps = {
  citations: AskCitation[];
  onOpenSource: (source: CitationSource) => void;
  className?: string;
};

export function CitationSources({
  citations,
  onOpenSource,
  className,
}: CitationSourcesProps) {
  const sources = dedupeCitationsByFile(citations);
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className={cn("mt-2.5 flex flex-col gap-1.5", className)}>
      <p className="text-xs font-medium text-muted-foreground">Sources</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source) => {
          const fileType = fileTypeFromFilename(source.filename);
          return (
            <button
              className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 text-left text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              key={source.fileId}
              onClick={() => onOpenSource(source)}
              type="button"
            >
              <PreviewFileTypeIcon
                className="shrink-0 text-muted-foreground"
                fileType={fileType}
                size={14}
                title={source.filename}
              />
              <span className="min-w-0 truncate">{source.filename}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
