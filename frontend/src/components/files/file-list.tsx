"use client";

import type { LibraryFile } from "@/lib/file-upload";

import { FileBookmarkButton } from "@/components/files/file-bookmark-button";
import { FileRowMenu } from "@/components/files/file-row-menu";
import { FileTypeIcon } from "@/components/files/file-type-icon";

type FileListProps = {
  files: LibraryFile[];
  onDelete: (file: LibraryFile) => void;
  onEditTags: (file: LibraryFile) => void;
  onReplace: (file: LibraryFile) => void;
  onToggleBookmark: (fileId: string) => void;
};

export function FileList({
  files,
  onDelete,
  onEditTags,
  onReplace,
  onToggleBookmark,
}: FileListProps) {
  if (files.length === 0) return null;

  return (
    <ul className="flex flex-col gap-0.5">
      {files.map((entry) => (
        <li
          key={entry.id}
          className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted"
        >
          <button
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-foreground"
            type="button"
          >
            <FileTypeIcon entry={entry} />
            <span className="min-w-0 flex-1 truncate font-medium">
              {entry.file.name}
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
        </li>
      ))}
    </ul>
  );
}
