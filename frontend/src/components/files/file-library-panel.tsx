"use client";

import { useState } from "react";

import { DeleteFileDialog } from "@/components/files/delete-file-dialog";
import { DeletePersonalFolderDialog } from "@/components/files/delete-personal-folder-dialog";
import { EditFileTagsDialog } from "@/components/files/edit-file-tags-dialog";
import { FileList } from "@/components/files/file-list";
import { PersonalFolderTree } from "@/components/files/personal-folder-tree";
import type { PersonalFoldersController } from "@/hooks/use-personal-folders";
import type { LibraryFile } from "@/lib/file-upload";
import type { PersonalFolder } from "@/lib/personal-folders";

type FileLibraryPanelProps = {
  files: LibraryFile[];
  /** Personal-folder tree view (default) vs. the flat list — flat is used
   * while a file search or bookmarks-only filter is active, since the tree
   * isn't search-aware in v1. */
  showTree: boolean;
  personalFolders: PersonalFoldersController;
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
  showTree,
  personalFolders,
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
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<PersonalFolder | null>(null);

  return (
    <>
      {showTree ? (
        <PersonalFolderTree
          editingFolderId={personalFolders.editingFolderId}
          expandedFolderIds={personalFolders.expandedFolderIds}
          files={files}
          folders={personalFolders.folders}
          items={personalFolders.items}
          onCancelEditing={personalFolders.cancelEditing}
          onDelete={setDeleteTarget}
          onEditTags={setEditTagsTarget}
          onMoveFile={personalFolders.moveFile}
          onMoveFolder={personalFolders.moveFolder}
          onOpenFile={onOpenFile}
          onRenameFolder={personalFolders.renameFolder}
          onReplace={(file) => onReplaceFile(file.id)}
          onRequestDeleteFolder={setDeleteFolderTarget}
          onStartRenaming={personalFolders.startRenaming}
          onToggleBookmark={onToggleBookmark}
          onToggleExpand={personalFolders.toggleExpand}
          revealFileId={revealFileId}
        />
      ) : (
        <FileList
          files={files}
          onDelete={setDeleteTarget}
          onEditTags={setEditTagsTarget}
          onOpenFile={onOpenFile}
          onReplace={(file) => onReplaceFile(file.id)}
          onToggleBookmark={onToggleBookmark}
          revealFileId={revealFileId}
        />
      )}

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

      <DeletePersonalFolderDialog
        folder={deleteFolderTarget}
        onConfirm={personalFolders.deleteFolder}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteFolderTarget(null);
          }
        }}
        open={deleteFolderTarget !== null}
      />
    </>
  );
}
