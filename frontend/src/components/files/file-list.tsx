"use client";

import { useEffect, useRef, useState } from "react";

import { IconDotsVertical } from "@tabler/icons-react";

import type { FileIngestStatus, LibraryFile } from "@/lib/file-upload";

import { FileBookmarkButton } from "@/components/files/file-bookmark-button";
import {
  FileRowContextMenu,
  type FileRowMenuAnchor,
} from "@/components/files/file-row-menu";
import { FileTypeIcon } from "@/components/files/file-type-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REVEAL_HIGHLIGHT_MS = 1500;

type FileListProps = {
  files: LibraryFile[];
  onDelete: (file: LibraryFile) => void;
  onEditTags: (file: LibraryFile) => void;
  onOpenFile: (file: LibraryFile) => void;
  onReplace: (file: LibraryFile) => void;
  onToggleBookmark: (fileId: string) => void;
  /** File to scroll into view and briefly highlight (Auto-reveal current file). */
  revealFileId?: string | null;
};

type RowContextMenuState = {
  file: LibraryFile;
  anchor: FileRowMenuAnchor;
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
  revealFileId = null,
}: FileListProps) {
  const [contextMenu, setContextMenu] = useState<RowContextMenuState | null>(
    null,
  );
  const [highlightedFileId, setHighlightedFileId] = useState<string | null>(
    null,
  );
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!revealFileId) return;
    const node = rowRefs.current.get(revealFileId);
    if (!node) return;

    node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setHighlightedFileId(revealFileId);
    const timer = setTimeout(() => setHighlightedFileId(null), REVEAL_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [revealFileId]);

  if (files.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {files.map((entry) => {
        const hint = fileHint(entry);
        return (
          <li
            key={entry.id}
            ref={(node) => {
              if (node) {
                rowRefs.current.set(entry.id, node);
              } else {
                rowRefs.current.delete(entry.id);
              }
            }}
            className={cn(
              "group rounded-md px-1 py-0.5 hover:bg-muted",
              highlightedFileId === entry.id &&
                "bg-accent/60 transition-colors duration-500",
            )}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu({
                file: entry,
                anchor: { x: event.clientX, y: event.clientY },
              });
            }}
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
                <Button
                  aria-label={`More actions for ${entry.file.name}`}
                  className="text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setContextMenu({
                      file: entry,
                      anchor: { x: rect.left, y: rect.bottom },
                    });
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <IconDotsVertical aria-hidden className="size-4" stroke={2.2} />
                </Button>
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

      {contextMenu ? (
        <FileRowContextMenu
          anchor={contextMenu.anchor}
          file={contextMenu.file}
          onDelete={onDelete}
          onDismiss={() => setContextMenu(null)}
          onEditTags={onEditTags}
          onReplace={onReplace}
        />
      ) : null}
    </ul>
  );
}
