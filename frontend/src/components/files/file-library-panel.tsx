"use client";

import { useState } from "react";

import { DeleteFileDialog } from "@/components/files/delete-file-dialog";
import { EditFileTagsDialog } from "@/components/files/edit-file-tags-dialog";
import { FileTree } from "@/components/files/file-tree";
import { useToast } from "@/components/providers/toast-provider";
import type { FileFoldersApi } from "@/hooks/use-file-folders";
import type { LibraryFile } from "@/lib/file-upload";

type FileLibraryPanelProps = {
  files: LibraryFile[];
  /** Filtered/sorted subset to list; dialogs still see every file. */
  visibleFiles?: LibraryFile[];
  activeFileId?: string | null;
  revealActive?: boolean;
  folderApi: FileFoldersApi;
  /** A search/bookmark filter is narrowing `visibleFiles`. */
  filtering?: boolean;
  onDeleteFile: (fileId: string) => void;
  onEditTags: (fileId: string, tags: string[]) => void;
  onOpenFile: (file: LibraryFile) => void;
  onReplaceFile: (fileId: string) => void;
  onToggleBookmark: (fileId: string) => void;
};

export function FileLibraryPanel({
  files,
  visibleFiles,
  activeFileId,
  revealActive,
  folderApi,
  filtering = false,
  onDeleteFile,
  onEditTags,
  onOpenFile,
  onReplaceFile,
  onToggleBookmark,
}: FileLibraryPanelProps) {
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<LibraryFile | null>(null);
  const [editTagsTarget, setEditTagsTarget] = useState<LibraryFile | null>(
    null,
  );

  return (
    <>
      <FileTree
        activeFileId={activeFileId}
        assignments={folderApi.assignments}
        collapsed={folderApi.collapsed}
        editingFolderId={folderApi.editingFolderId}
        files={visibleFiles ?? files}
        filtering={filtering}
        folders={folderApi.folders}
        onDelete={setDeleteTarget}
        onDeleteFolder={(folder) => {
          folderApi.deleteFolder(folder.id);
          toast.success({
            title: `Deleted "${folder.name}"`,
            description: "Its files moved back to the top level.",
          });
        }}
        onEditTags={setEditTagsTarget}
        onMoveFile={folderApi.moveFile}
        onOpenFile={onOpenFile}
        onRenameFolder={folderApi.renameFolder}
        onReplace={(file) => onReplaceFile(file.id)}
        onStartRename={folderApi.setEditingFolderId}
        onToggleBookmark={onToggleBookmark}
        onToggleFolder={folderApi.toggleCollapsed}
        revealActive={revealActive}
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
