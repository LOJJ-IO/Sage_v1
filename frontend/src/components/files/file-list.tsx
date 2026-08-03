"use client";

import type { FileIngestStatus, LibraryFile } from "@/lib/file-upload";

import { FileBookmarkButton } from "@/components/files/file-bookmark-button";
import { FileRowMenu } from "@/components/files/file-row-menu";
import { FileTypeIcon } from "@/components/files/file-type-icon";

type FileListProps = {
  files: LibraryFile[];
  onDelete: (file: LibraryFile) => void;
  onEditTags: (file: LibraryFile) => void;
  onOpenFile: (file: LibraryFile) => void;
  onReplace: (file: LibraryFile) => void;
  onToggleBookmark: (fileId: string) => void;
};

function statusLabel(status: FileIngestStatus): string {
  switch (status) {
    case "pending":
    case "processing":
      return "Indexing…";
    case "indexed":
      return "Ready";
    case "failed":
      return "Failed";
  }
}

function fileHint(entry: LibraryFile): string | null {
  if (entry.status === "failed") {
    return entry.error?.trim() || "Indexing failed — try replace or re-upload.";
  }
  return null;
}

export function FileList({
  files,
  onDelete,
  onEditTags,
  onOpenFile,
  onReplace,
  onToggleBookmark,
}: FileListProps) {
  if (files.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {files.map((entry) => {
        const hint = fileHint(entry);
        return (
          <li
            key={entry.id}
            className="rounded-md px-1 py-0.5 hover:bg-muted"
          >
            <div className="flex min-w-0 items-center gap-1">
              <button
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-foreground"
                onClick={() => onOpenFile(entry)}
                type="button"
              >
                <FileTypeIcon entry={entry} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {entry.file.name}
                </span>
                <span
                  className={
                    entry.status === "failed"
                      ? "shrink-0 text-xs text-destructive"
                      : entry.status === "indexed"
                        ? "shrink-0 text-xs text-muted-foreground"
                        : "shrink-0 text-xs text-muted-foreground"
                  }
                >
                  {statusLabel(entry.status)}
                </span>
              </button>

              <div className="flex shrink-0 items-center">
                <FileBookmarkButton
                  bookmarked={entry.isBookmarked}
                  filename={entry.file.name}
                  onToggle={() => onToggleBookmark(entry.id)}
                />
                <FileRowMenu
                  file={entry}
                  onDelete={onDelete}
                  onEditTags={onEditTags}
                  onReplace={onReplace}
                />
              </div>
            </div>
            {hint ? (
              <p className="px-1 pb-1 pl-9 text-xs text-muted-foreground">
                {hint}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
