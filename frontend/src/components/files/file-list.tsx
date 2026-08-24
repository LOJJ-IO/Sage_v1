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

const REVEAL_HIGHLIGHT_MS = 3000;
const INDEXING_DOT_INTERVAL_MS = 500;

/** Cycling "Indexing." / "Indexing.." / "Indexing..." — an indexed file shows
 * no status text at all (nothing to say), so only pending/processing files
 * ever render this. */
function IndexingLabel() {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setDotCount((current) => (current % 3) + 1);
    }, INDEXING_DOT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return <>{`Indexing${".".repeat(dotCount)}`}</>;
}

function StatusLabel({ status }: { status: FileIngestStatus }) {
  switch (status) {
    case "pending":
    case "processing":
      return <IndexingLabel />;
    case "indexed":
      return null;
    case "failed":
      return <>Failed</>;
  }
}

export function fileHint(entry: LibraryFile): string | null {
  if (entry.status === "failed") {
    return entry.error?.trim() || "Indexing failed — try replace or re-upload.";
  }
  return null;
}

export type FileRowProps = {
  entry: LibraryFile;
  onOpenFile: (file: LibraryFile) => void;
  onToggleBookmark: (fileId: string) => void;
  onContextMenu: (file: LibraryFile, anchor: FileRowMenuAnchor) => void;
  onKebabClick: (file: LibraryFile, anchor: FileRowMenuAnchor) => void;
  highlighted?: boolean;
  rowRef?: (node: HTMLLIElement | null) => void;
  /** Lets the tree view make rows draggable without FileList needing to know about it. */
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLLIElement>) => void;
};

/** One file row — the shared look used by both the flat `FileList` and the
 * personal-folder tree, so files render identically in either view. */
export function FileRow({
  entry,
  onOpenFile,
  onToggleBookmark,
  onContextMenu,
  onKebabClick,
  highlighted = false,
  rowRef,
  draggable = false,
  onDragStart,
  onDragEnd,
}: FileRowProps) {
  const hint = fileHint(entry);

  return (
    <li
      className={cn(
        "group rounded-md px-1 py-0.5 hover:bg-muted",
        highlighted && "bg-accent/60 transition-colors duration-500",
      )}
      draggable={draggable}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(entry, { x: event.clientX, y: event.clientY });
      }}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      ref={rowRef}
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
          {entry.status === "indexed" ? null : (
            <span
              className={
                entry.status === "failed"
                  ? "shrink-0 text-xs text-destructive"
                  : "shrink-0 text-xs text-muted-foreground"
              }
            >
              <StatusLabel status={entry.status} />
            </span>
          )}
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
              onKebabClick(entry, { x: rect.left, y: rect.bottom });
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
        <p className="px-1 pb-1 pl-9 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </li>
  );
}

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
      {files.map((entry) => (
        <FileRow
          entry={entry}
          highlighted={highlightedFileId === entry.id}
          key={entry.id}
          onContextMenu={(file, anchor) => setContextMenu({ file, anchor })}
          onKebabClick={(file, anchor) => setContextMenu({ file, anchor })}
          onOpenFile={onOpenFile}
          onToggleBookmark={onToggleBookmark}
          rowRef={(node) => {
            if (node) {
              rowRefs.current.set(entry.id, node);
            } else {
              rowRefs.current.delete(entry.id);
            }
          }}
        />
      ))}

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
