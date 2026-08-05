"use client";

import { useState } from "react";

import { DeleteFileDialog } from "@/components/files/delete-file-dialog";
import { EditFileTagsDialog } from "@/components/files/edit-file-tags-dialog";
import { FileList } from "@/components/files/file-list";
import type { LibraryFile } from "@/lib/file-upload";

type FileLibraryPanelProps = {
  files: LibraryFile[];
  onDeleteFile: (fileId: string) => void;
  onEditTags: (fileId: string, tags: string[]) => void;
  onOpenFile: (file: LibraryFile) => void;
  onReplaceFile: (fileId: string) => void;
  onToggleBookmark: (fileId: string) => void;
  /** When set (Auto-reveal current file), scrolls this file's row into view and briefly highlights it. */
  revealFileId?: string | null;
};

export function FileLibraryPanel({
  files,
  onDeleteFile,
  onEditTags,
  onOpenFile,
  onReplaceFile,
  onToggleBookmark,
  revealFileId = null,
}: FileLibraryPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<LibraryFile | null>(null);
  const [editTagsTarget, setEditTagsTarget] = useState<LibraryFile | null>(
    null,
  );

  return (
    <>
      <FileList
        files={files}
        onDelete={setDeleteTarget}
        onEditTags={setEditTagsTarget}
        onOpenFile={onOpenFile}
        onReplace={(file) => onReplaceFile(file.id)}
        onToggleBookmark={onToggleBookmark}
        revealFileId={revealFileId}
      />

      <DeleteFileDialog
        file={deleteTarget}
        onConfirm={onDeleteFile}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
      />

      <EditFileTagsDialog
        file={editTagsTarget}
        files={files}
        onOpenChange={(open) => {
          if (!open) {
            setEditTagsTarget(null);
          }
        }}
        onSubmit={onEditTags}
        open={editTagsTarget !== null}
      />
    </>
  );
}
