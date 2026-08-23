"use client";

import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { PersonalFolder } from "@/lib/personal-folders";

export type FolderRowMenuAnchor = {
  x: number;
  y: number;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(anchor: FolderRowMenuAnchor, menu: HTMLElement): MenuPosition {
  const menuRect = menu.getBoundingClientRect();
  const viewportPadding = 8;

  const openUpward =
    window.innerHeight - anchor.y < menuRect.height + viewportPadding &&
    anchor.y > window.innerHeight - anchor.y;

  const top = openUpward ? anchor.y - menuRect.height : anchor.y;
  const left = Math.min(
    Math.max(viewportPadding, anchor.x),
    window.innerWidth - menuRect.width - viewportPadding,
  );

  return { top, left };
}

type FolderRowContextMenuProps = {
  folder: PersonalFolder;
  anchor: FolderRowMenuAnchor;
  onDismiss: () => void;
  onRename: (folder: PersonalFolder) => void;
  onDelete: (folder: PersonalFolder) => void;
};

/** Right-click / kebab menu for a personal-folder row — mirrors `FileRowContextMenu`. */
export function FolderRowContextMenu({
  folder,
  anchor,
  onDismiss,
  onRename,
  onDelete,
}: FolderRowContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    setMenuPosition(getMenuPosition(anchor, menuRef.current));
  }, [anchor]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onDismiss();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("scroll", onDismiss, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("scroll", onDismiss, true);
    };
  }, [onDismiss]);

  if (typeof document === "undefined") return null;

  const menu = (
    <div
      className="fixed z-50 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md"
      ref={menuRef}
      role="menu"
      style={
        menuPosition
          ? { top: menuPosition.top, left: menuPosition.left }
          : { top: -9999, left: -9999, visibility: "hidden" }
      }
    >
      <button
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
        onClick={() => {
          onDismiss();
          onRename(folder);
        }}
        role="menuitem"
        type="button"
      >
        <IconEdit aria-hidden className="size-4" stroke={2.2} />
        Rename
      </button>

      <button
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
        onClick={() => {
          onDismiss();
          onDelete(folder);
        }}
        role="menuitem"
        type="button"
      >
        <IconTrash aria-hidden className="size-4" stroke={2.2} />
        Delete
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}
