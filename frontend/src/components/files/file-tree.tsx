"use client";

import {
  IconChevronRight,
  IconFolder,
  IconFolderOpen,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useState, type ComponentProps, type DragEvent } from "react";

import { FILE_DRAG_TYPE, FileList } from "@/components/files/file-list";
import type { FileFolder } from "@/hooks/use-file-folders";
import type { LibraryFile } from "@/lib/file-upload";
import { cn } from "@/lib/utils";

type RowHandlers = Omit<
  ComponentProps<typeof FileList>,
  "files" | "folders" | "folderIdOf" | "onMove"
>;

type FileTreeProps = RowHandlers & {
  /** Already filtered + sorted. */
  files: LibraryFile[];
  folders: FileFolder[];
  assignments: Record<string, string>;
  collapsed: string[];
  editingFolderId: string | null;
  /** Search/bookmark filter on: hide folders with no matches, expand the rest. */
  filtering: boolean;
  onMoveFile: (fileId: string, folderId: string | null) => void;
  onToggleFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onStartRename: (folderId: string) => void;
  onDeleteFolder: (folder: FileFolder) => void;
};

function readDraggedFileId(event: DragEvent) {
  return event.dataTransfer.getData(FILE_DRAG_TYPE) || null;
}

function acceptsFileDrag(event: DragEvent) {
  return event.dataTransfer.types.includes(FILE_DRAG_TYPE);
}

function FolderNameInput({
  initial,
  onDone,
}: {
  initial: string;
  onDone: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      aria-label="Folder name"
      autoFocus
      className="h-7 min-w-0 flex-1 rounded-md border border-ring bg-background px-1.5 text-sm font-medium outline-none ring-2 ring-ring/30"
      onBlur={() => onDone(value)}
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={(event) => {
        if (event.key === "Enter") onDone(value);
        if (event.key === "Escape") onDone(initial);
      }}
      value={value}
    />
  );
}

/** Folders (collapsible, drop targets) above the root-level files. */
export function FileTree({
  files,
  folders,
  assignments,
  collapsed,
  editingFolderId,
  filtering,
  onMoveFile,
  onToggleFolder,
  onRenameFolder,
  onStartRename,
  onDeleteFolder,
  activeFileId,
  revealActive,
  ...rowHandlers
}: FileTreeProps) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const folderIds = new Set(folders.map((f) => f.id));
  const folderIdOf = (fileId: string) => {
    const id = assignments[fileId];
    return id && folderIds.has(id) ? id : null;
  };
  const rootFiles = files.filter((file) => folderIdOf(file.id) === null);

  const dropProps = (target: string) => ({
    onDragOver: (event: DragEvent) => {
      if (!acceptsFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTarget(target);
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setDropTarget((current) => (current === target ? null : current));
      }
    },
    onDrop: (event: DragEvent) => {
      const fileId = readDraggedFileId(event);
      setDropTarget(null);
      if (!fileId) return;
      event.preventDefault();
      onMoveFile(fileId, target === "root" ? null : target);
    },
  });

  const listProps = {
    ...rowHandlers,
    activeFileId,
    revealActive,
    folders,
    folderIdOf,
    onMove: (file: LibraryFile, folderId: string | null) => onMoveFile(file.id, folderId),
  };

  return (
    <div className="flex flex-col gap-1">
      {folders.map((folder) => {
        const folderFiles = files.filter((file) => folderIdOf(file.id) === folder.id);
        if (filtering && folderFiles.length === 0) return null;
        // Auto-reveal opens the folder holding the active file without changing saved state.
        const holdsActive =
          revealActive && activeFileId != null && folderFiles.some((f) => f.id === activeFileId);
        const open = filtering || holdsActive || !collapsed.includes(folder.id);
        const FolderIcon = open ? IconFolderOpen : IconFolder;

        return (
          <div
            className={cn(
              "rounded-md transition-colors",
              dropTarget === folder.id && "bg-primary/5 ring-1 ring-primary/40",
            )}
            data-folder-id={folder.id}
            key={folder.id}
            {...dropProps(folder.id)}
          >
            <div className="group flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted">
              {editingFolderId === folder.id ? (
                <>
                  <IconFolderOpen aria-hidden className="ml-5 size-4 shrink-0 text-muted-foreground" stroke={2} />
                  <FolderNameInput
                    initial={folder.name}
                    onDone={(name) => onRenameFolder(folder.id, name)}
                  />
                </>
              ) : (
                <>
                  <button
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-md px-0.5 py-1 text-left text-sm text-foreground"
                    onClick={() => onToggleFolder(folder.id)}
                    onDoubleClick={() => onStartRename(folder.id)}
                    type="button"
                  >
                    <IconChevronRight
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-90",
                      )}
                      stroke={2}
                    />
                    <FolderIcon aria-hidden className="size-4 shrink-0 text-primary/80" stroke={2} />
                    <span className="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{folderFiles.length}</span>
                  </button>
                  <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      aria-label={`Rename ${folder.name}`}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                      onClick={() => onStartRename(folder.id)}
                      type="button"
                    >
                      <IconPencil aria-hidden className="size-3.5" stroke={2} />
                    </button>
                    <button
                      aria-label={`Delete folder ${folder.name}`}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDeleteFolder(folder)}
                      type="button"
                    >
                      <IconTrash aria-hidden className="size-3.5" stroke={2} />
                    </button>
                  </span>
                </>
              )}
            </div>
            {open ? (
              <div className="ml-3 border-l border-border pl-2">
                {folderFiles.length > 0 ? (
                  <FileList {...listProps} files={folderFiles} />
                ) : (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    Empty — drag files here or right-click a file → Move to.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}

      <div
        className={cn(
          "min-h-8 rounded-md transition-colors",
          dropTarget === "root" && "bg-primary/5 ring-1 ring-primary/40",
        )}
        {...dropProps("root")}
      >
        <FileList {...listProps} files={rootFiles} />
      </div>
    </div>
  );
}
