"use client";

import type { DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconChevronRight, IconDotsVertical, IconTrash } from "@tabler/icons-react";

import { FileRow } from "@/components/files/file-list";
import type { FileRowMenuAnchor } from "@/components/files/file-row-menu";
import { FileRowContextMenu } from "@/components/files/file-row-menu";
import {
  FolderRowContextMenu,
  type FolderRowMenuAnchor,
} from "@/components/files/folder-row-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { compareLibraryFiles, DEFAULT_FILE_SORT_ORDER, type FileSortOrder, type LibraryFile } from "@/lib/file-upload";
import {
  buildFolderTree,
  getFolderChildFileIds,
  getRootFileIds,
  wouldCreateCycle,
  type PersonalFolder,
  type PersonalFolderId,
  type PersonalFolderItem,
  type TreeFolderNode,
} from "@/lib/personal-folders";

const REVEAL_HIGHLIGHT_MS = 3000;
const ROOT_DROP_TARGET = "__root__";
const INDENT_PX = 16;
/** A folder row's chevron button (18px: 14px icon + 2px padding each side)
 * plus the row's gap-1 (4px) before the folder icon. Root-level files have
 * no chevron of their own, so without this they'd start flush with where a
 * sibling folder's *chevron* sits instead of where its *icon* sits — making
 * a file row look like it's nested inside the folder above it. */
const ROOT_FILE_INDENT_PX = 22;

type DraggedItem = { type: "file" | "folder"; id: string };

function FolderIcon({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "codicon shrink-0 text-muted-foreground [-webkit-text-stroke:0.35px_currentColor]",
        open ? "codicon-folder-opened" : "codicon-folder",
      )}
      style={{ fontSize: 16 }}
    />
  );
}

type SharedRowCallbacks = {
  onOpenFile: (file: LibraryFile) => void;
  onToggleBookmark: (fileId: string) => void;
  onDeleteFile: (file: LibraryFile) => void;
  onEditTagsFile: (file: LibraryFile) => void;
  onReplaceFile: (file: LibraryFile) => void;
  onRenameFolder: (folderId: PersonalFolderId, name: string) => void;
  onCancelEditing: () => void;
  onStartRenaming: (folderId: PersonalFolderId) => void;
  onRequestDeleteFolder: (folder: PersonalFolder) => void;
  onToggleExpand: (folderId: PersonalFolderId) => void;
};

type DragCallbacks = {
  draggedItem: DraggedItem | null;
  dragOverTarget: string | null;
  onRowDragStart: (item: DraggedItem) => void;
  onRowDragEnd: () => void;
  onContainerDragOver: (event: DragEvent, targetFolderId: PersonalFolderId | null) => void;
  onContainerDragLeave: (targetFolderId: PersonalFolderId | null) => void;
  onContainerDrop: (event: DragEvent, targetFolderId: PersonalFolderId | null) => void;
};

function isValidDropTarget(
  draggedItem: DraggedItem | null,
  folders: PersonalFolder[],
  targetFolderId: PersonalFolderId | null,
): boolean {
  if (!draggedItem) return false;
  if (draggedItem.type === "file") return true;
  if (targetFolderId === null) return true;
  return !wouldCreateCycle(folders, draggedItem.id, targetFolderId);
}

type FolderNodeProps = {
  node: TreeFolderNode;
  depth: number;
  folders: PersonalFolder[];
  items: PersonalFolderItem[];
  filesById: Map<string, LibraryFile>;
  expandedFolderIds: Set<PersonalFolderId>;
  editingFolderId: PersonalFolderId | null;
  revealFileId: string | null;
  highlightedFileId: string | null;
  rowRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
  fileContextMenu: { file: LibraryFile; anchor: FileRowMenuAnchor } | null;
  setFileContextMenu: (state: { file: LibraryFile; anchor: FileRowMenuAnchor } | null) => void;
  folderContextMenu: { folder: PersonalFolder; anchor: FolderRowMenuAnchor } | null;
  setFolderContextMenu: (state: { folder: PersonalFolder; anchor: FolderRowMenuAnchor } | null) => void;
} & SharedRowCallbacks &
  DragCallbacks;

function FolderNode(props: FolderNodeProps) {
  const {
    node,
    depth,
    folders,
    items,
    filesById,
    expandedFolderIds,
    editingFolderId,
    draggedItem,
    dragOverTarget,
    onRowDragStart,
    onRowDragEnd,
    onContainerDragOver,
    onContainerDragLeave,
    onContainerDrop,
    setFolderContextMenu,
  } = props;
  const { folder, children } = node;
  const expanded = expandedFolderIds.has(folder.id);
  const isEditing = editingFolderId === folder.id;
  const isDragging = draggedItem?.type === "folder" && draggedItem.id === folder.id;
  const isDropTarget = dragOverTarget === folder.id && isValidDropTarget(draggedItem, folders, folder.id);
  const [draftName, setDraftName] = useState(folder.folderName);

  useEffect(() => {
    setDraftName(folder.folderName);
  }, [folder.folderName]);

  const childFileIds = getFolderChildFileIds(items, folder.id).filter((id) => filesById.has(id));

  const commitRename = () => props.onRenameFolder(folder.id, draftName);

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-muted",
          isDragging && "opacity-40",
          isDropTarget && "bg-accent/60 ring-1 ring-inset ring-accent",
        )}
        draggable={!isEditing}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setFolderContextMenu({ folder, anchor: { x: event.clientX, y: event.clientY } });
        }}
        onDragEnd={onRowDragEnd}
        onDragLeave={() => onContainerDragLeave(folder.id)}
        onDragOver={(event) => {
          event.stopPropagation();
          onContainerDragOver(event, folder.id);
        }}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.setData("text/plain", folder.id);
          onRowDragStart({ type: "folder", id: folder.id });
        }}
        onDrop={(event) => {
          event.stopPropagation();
          onContainerDrop(event, folder.id);
        }}
        style={{ paddingLeft: depth * INDENT_PX }}
      >
        <button
          aria-label={expanded ? `Collapse ${folder.folderName}` : `Expand ${folder.folderName}`}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted-foreground/10"
          onClick={() => props.onToggleExpand(folder.id)}
          type="button"
        >
          <IconChevronRight
            aria-hidden
            className={cn("size-3.5 transition-transform", expanded && "rotate-90")}
            stroke={2.2}
          />
        </button>
        <FolderIcon open={expanded} />
        {isEditing ? (
          <input
            autoFocus
            className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-0.5 text-sm"
            onBlur={commitRename}
            onChange={(event) => setDraftName(event.target.value)}
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                setDraftName(folder.folderName);
                props.onCancelEditing();
              }
            }}
            value={draftName}
          />
        ) : (
          <button
            className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground"
            onClick={() => props.onToggleExpand(folder.id)}
            type="button"
          >
            {folder.folderName}
          </button>
        )}
        {!isEditing ? (
          <Button
            aria-label={`More actions for ${folder.folderName}`}
            className="shrink-0 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setFolderContextMenu({ folder, anchor: { x: rect.left, y: rect.bottom } });
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <IconDotsVertical aria-hidden className="size-4" stroke={2.2} />
          </Button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.ul
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children.map((childNode) => (
              <FolderNode {...props} depth={depth + 1} key={childNode.folder.id} node={childNode} />
            ))}
            {childFileIds.map((fileId) => {
              const entry = filesById.get(fileId);
              if (!entry) return null;
              return (
                <div key={fileId} style={{ paddingLeft: (depth + 1) * INDENT_PX }}>
                  <FileRow
                    draggable
                    entry={entry}
                    highlighted={props.highlightedFileId === fileId}
                    onContextMenu={(file, anchor) => props.setFileContextMenu({ file, anchor })}
                    onDragEnd={onRowDragEnd}
                    onDragStart={(event) => {
                      event.stopPropagation();
                      event.dataTransfer.setData("text/plain", fileId);
                      onRowDragStart({ type: "file", id: fileId });
                    }}
                    onKebabClick={(file, anchor) => props.setFileContextMenu({ file, anchor })}
                    onOpenFile={props.onOpenFile}
                    onToggleBookmark={props.onToggleBookmark}
                    rowRef={(node) => {
                      if (node) props.rowRefs.current.set(fileId, node);
                      else props.rowRefs.current.delete(fileId);
                    }}
                  />
                </div>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

export type PersonalFolderTreeProps = {
  folders: PersonalFolder[];
  items: PersonalFolderItem[];
  files: LibraryFile[];
  expandedFolderIds: Set<PersonalFolderId>;
  onToggleExpand: (folderId: PersonalFolderId) => void;
  editingFolderId: PersonalFolderId | null;
  onRenameFolder: (folderId: PersonalFolderId, name: string) => void;
  onCancelEditing: () => void;
  onStartRenaming: (folderId: PersonalFolderId) => void;
  onRequestDeleteFolder: (folder: PersonalFolder) => void;
  onMoveFile: (fileId: string, folderId: PersonalFolderId | null) => void;
  onMoveFolder: (folderId: PersonalFolderId, parentFolderId: PersonalFolderId | null) => void;
  onDelete: (file: LibraryFile) => void;
  onEditTags: (file: LibraryFile) => void;
  onOpenFile: (file: LibraryFile) => void;
  onReplace: (file: LibraryFile) => void;
  onToggleBookmark: (fileId: string) => void;
  revealFileId?: string | null;
  /** Only affects the fallback ordering of never-touched root files — files/
   * folders the user has explicitly positioned (by dragging) keep their
   * drag order regardless of criteria or direction. */
  sortOrder?: FileSortOrder;
};

/** Recursive personal-folder tree — purely a per-user visual overlay on the
 * same shared files `FileList` renders flat. See `use-personal-folders.ts`. */
export function PersonalFolderTree({
  folders,
  items,
  files,
  expandedFolderIds,
  onToggleExpand,
  editingFolderId,
  onRenameFolder,
  onCancelEditing,
  onStartRenaming,
  onRequestDeleteFolder,
  onMoveFile,
  onMoveFolder,
  onDelete,
  onEditTags,
  onOpenFile,
  onReplace,
  onToggleBookmark,
  revealFileId = null,
  sortOrder = DEFAULT_FILE_SORT_ORDER,
}: PersonalFolderTreeProps) {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  // HTML5 drag events (dragstart -> dragover -> drop) can fire faster than
  // React re-renders — a dragover on the very next frame can still see a
  // stale (pre-dragstart) closure with `draggedItem === null` if only React
  // state were used, silently breaking every drop. This ref is updated
  // synchronously in the same tick as dragstart/dragend, so drag-over/drop
  // handlers always read the current value regardless of render timing;
  // `draggedItem` state stays only for the (non-critical) visual feedback.
  const draggedItemRef = useRef<DraggedItem | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [isTrashDropTarget, setIsTrashDropTarget] = useState(false);
  const [fileContextMenu, setFileContextMenu] = useState<{
    file: LibraryFile;
    anchor: FileRowMenuAnchor;
  } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folder: PersonalFolder;
    anchor: FolderRowMenuAnchor;
  } | null>(null);
  const [highlightedFileId, setHighlightedFileId] = useState<string | null>(null);
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

  const filesById = new Map(files.map((entry) => [entry.id, entry]));
  const tree = buildFolderTree(folders);
  const rootFileIds = getRootFileIds(
    items,
    files.map((f) => f.id),
    (a, b) => {
      const fileA = filesById.get(a);
      const fileB = filesById.get(b);
      if (!fileA || !fileB) return 0;
      return compareLibraryFiles(fileA, fileB, sortOrder.criteria);
    },
    sortOrder.direction,
  ).filter((id) => filesById.has(id));

  const handleContainerDragOver = (event: DragEvent, targetFolderId: PersonalFolderId | null) => {
    if (!isValidDropTarget(draggedItemRef.current, folders, targetFolderId)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverTarget(targetFolderId ?? ROOT_DROP_TARGET);
  };

  const handleContainerDragLeave = (targetFolderId: PersonalFolderId | null) => {
    setDragOverTarget((current) => (current === (targetFolderId ?? ROOT_DROP_TARGET) ? null : current));
  };

  const handleContainerDrop = (event: DragEvent, targetFolderId: PersonalFolderId | null) => {
    event.preventDefault();
    setDragOverTarget(null);
    const dragged = draggedItemRef.current;
    draggedItemRef.current = null;
    setDraggedItem(null);
    if (!dragged || !isValidDropTarget(dragged, folders, targetFolderId)) return;
    if (dragged.type === "file") {
      onMoveFile(dragged.id, targetFolderId);
    } else {
      onMoveFolder(dragged.id, targetFolderId);
    }
  };

  const handleRowDragStart = (item: DraggedItem) => {
    draggedItemRef.current = item;
    setDraggedItem(item);
  };

  const handleRowDragEnd = () => {
    draggedItemRef.current = null;
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const sharedProps: SharedRowCallbacks & DragCallbacks = {
    onOpenFile,
    onToggleBookmark,
    onDeleteFile: onDelete,
    onEditTagsFile: onEditTags,
    onReplaceFile: onReplace,
    onRenameFolder,
    onCancelEditing,
    onStartRenaming,
    onRequestDeleteFolder,
    onToggleExpand,
    draggedItem,
    dragOverTarget,
    onRowDragStart: handleRowDragStart,
    onRowDragEnd: handleRowDragEnd,
    onContainerDragOver: handleContainerDragOver,
    onContainerDragLeave: handleContainerDragLeave,
    onContainerDrop: handleContainerDrop,
  };

  const isRootDropTarget = dragOverTarget === ROOT_DROP_TARGET && isValidDropTarget(draggedItem, folders, null);

  return (
    <>
      <ul
        className={cn(
          // min-h-full (not min-h-8): the root "un-nest here" drop target
          // must cover the whole panel's blank space below the rows, not
          // just the rows' own height, or dragging to an empty area below a
          // short tree has nowhere to land.
          "flex min-h-full flex-col gap-0.5 rounded-md",
          isRootDropTarget && "bg-accent/30 ring-1 ring-inset ring-accent",
        )}
        onDragLeave={() => handleContainerDragLeave(null)}
        onDragOver={(event) => handleContainerDragOver(event, null)}
        onDrop={(event) => handleContainerDrop(event, null)}
      >
        {tree.map((node) => (
          <FolderNode
            depth={0}
            editingFolderId={editingFolderId}
            filesById={filesById}
            folderContextMenu={folderContextMenu}
            folders={folders}
            fileContextMenu={fileContextMenu}
            highlightedFileId={highlightedFileId}
            items={items}
            key={node.folder.id}
            node={node}
            revealFileId={revealFileId}
            rowRefs={rowRefs}
            setFileContextMenu={setFileContextMenu}
            setFolderContextMenu={setFolderContextMenu}
            expandedFolderIds={expandedFolderIds}
            {...sharedProps}
          />
        ))}

        {rootFileIds.map((fileId) => {
          const entry = filesById.get(fileId);
          if (!entry) return null;
          return (
            <div key={fileId} style={{ paddingLeft: ROOT_FILE_INDENT_PX }}>
              <FileRow
                draggable
                entry={entry}
                highlighted={highlightedFileId === fileId}
                onContextMenu={(file, anchor) => setFileContextMenu({ file, anchor })}
                onDragEnd={sharedProps.onRowDragEnd}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", fileId);
                  handleRowDragStart({ type: "file", id: fileId });
                }}
                onKebabClick={(file, anchor) => setFileContextMenu({ file, anchor })}
                onOpenFile={onOpenFile}
                onToggleBookmark={onToggleBookmark}
                rowRef={(node) => {
                  if (node) rowRefs.current.set(fileId, node);
                  else rowRefs.current.delete(fileId);
                }}
              />
            </div>
          );
        })}
      </ul>

      {fileContextMenu ? (
        <FileRowContextMenu
          anchor={fileContextMenu.anchor}
          file={fileContextMenu.file}
          onDelete={onDelete}
          onDismiss={() => setFileContextMenu(null)}
          onEditTags={onEditTags}
          onReplace={onReplace}
        />
      ) : null}

      {folderContextMenu ? (
        <FolderRowContextMenu
          anchor={folderContextMenu.anchor}
          folder={folderContextMenu.folder}
          onDelete={onRequestDeleteFolder}
          onDismiss={() => setFolderContextMenu(null)}
          onRename={(folder) => onStartRenaming(folder.id)}
        />
      ) : null}

      {/* Direct-manipulation delete: appears only while dragging. Routes
          through the same confirm dialogs a kebab-menu delete would (file
          deletion is genuinely destructive to the shared knowledge base —
          the drag gesture initiates delete, it doesn't skip confirming it;
          folder delete already never touches real files either way). */}
      {draggedItem ? (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-sm shadow-lg transition-colors",
            isTrashDropTarget
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border-border bg-popover text-muted-foreground",
          )}
          onDragLeave={() => setIsTrashDropTarget(false)}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setIsTrashDropTarget(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsTrashDropTarget(false);
            const dragged = draggedItemRef.current;
            draggedItemRef.current = null;
            setDraggedItem(null);
            if (!dragged) return;
            if (dragged.type === "folder") {
              const target = folders.find((f) => f.id === dragged.id);
              if (target) onRequestDeleteFolder(target);
            } else {
              const target = filesById.get(dragged.id);
              if (target) onDelete(target);
            }
          }}
        >
          <IconTrash aria-hidden className="size-4" stroke={2.2} />
          Drop to delete
        </div>
      ) : null}
    </>
  );
}
