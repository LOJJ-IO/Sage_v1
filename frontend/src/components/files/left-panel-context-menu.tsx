"use client";

import { IconBookmark, IconFolderPlus, IconUpload } from "@tabler/icons-react";

import { ContextMenuItem, ContextMenuPortal, type ContextMenuAnchor } from "@/components/ui/context-menu";

type LeftPanelContextMenuProps = {
  anchor: ContextMenuAnchor;
  onDismiss: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  bookmarkedOnly: boolean;
  onToggleBookmarks: () => void;
};

/** Right-click on empty space in the Files panel — the same actions already
 * in the panel's own toolbar, at the cursor instead of a trip to the header. */
export function LeftPanelContextMenu({
  anchor,
  onDismiss,
  onNewFolder,
  onUpload,
  bookmarkedOnly,
  onToggleBookmarks,
}: LeftPanelContextMenuProps) {
  return (
    <ContextMenuPortal anchor={anchor} onDismiss={onDismiss}>
      <ContextMenuItem
        icon={<IconFolderPlus aria-hidden className="size-4" stroke={2.2} />}
        label="New folder"
        onSelect={() => {
          onDismiss();
          onNewFolder();
        }}
      />
      <ContextMenuItem
        icon={<IconUpload aria-hidden className="size-4" stroke={2.2} />}
        label="Upload"
        onSelect={() => {
          onDismiss();
          onUpload();
        }}
      />
      <ContextMenuItem
        icon={<IconBookmark aria-hidden className="size-4" stroke={2.2} />}
        label={bookmarkedOnly ? "Show all files" : "Bookmarks"}
        onSelect={() => {
          onDismiss();
          onToggleBookmarks();
        }}
      />
    </ContextMenuPortal>
  );
}
