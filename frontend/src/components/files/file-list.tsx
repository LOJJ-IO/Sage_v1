"use client";

import { useEffect, useRef, useState } from "react";

import type { FileIngestStatus, LibraryFile } from "@/lib/file-upload";

import { FileBookmarkButton } from "@/components/files/file-bookmark-button";
import {
  FileRowContextMenu,
  type FileRowMenuAnchor,
} from "@/components/files/file-row-menu";
import { FileTypeIcon } from "@/components/files/file-type-icon";

type FileListProps = {
  files: LibraryFile[];
  /** File shown in the active preview tab; highlighted when `revealActive`. */
  activeFileId?: string | null;
  /** Auto-reveal: highlight the active file and scroll it into view. */
  revealActive?: boolean;
  onDelete: (file: LibraryFile) => void;
  onEditTags: (file: LibraryFile) => void;
  onOpenFile: (file: LibraryFile) => void;
  onReplace: (file: LibraryFile) => void;
  onToggleBookmark: (fileId: string) => void;
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
  if (entry.looksScanned) {
    return "Looks scanned — OCR is off, so Sage may refuse questions about this file. Prefer a text PDF, .docx, or .txt.";
  }
  return null;
}

export function FileList({
  files,
  activeFileId = null,
  revealActive = false,
  onDelete,
  onEditTags,
  onOpenFile,
  onReplace,
  onToggleBookmark,
}: FileListProps) {
  const [contextMenu, setContextMenu] = useState<RowContextMenuState | null>(
    null,
  );

  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!revealActive || !activeFileId) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-file-id="${CSS.escape(activeFileId)}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [activeFileId, revealActive]);

  if (files.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1" ref={listRef}>
      {files.map((entry) => {
        const hint = fileHint(entry);
        return (
          <li
            key={entry.id}
            className={
              revealActive && entry.id === activeFileId
                ? "rounded-md bg-muted px-1 py-0.5"
                : "rounded-md px-1 py-0.5 hover:bg-muted"
            }
            data-file-id={entry.id}
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
