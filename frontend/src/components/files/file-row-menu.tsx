"use client";

import { IconReplace, IconTag, IconTrash } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { LibraryFile } from "@/lib/file-upload";

export type FileRowMenuAnchor = {
  x: number;
  y: number;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(
  anchor: FileRowMenuAnchor,
  menu: HTMLElement,
): MenuPosition {
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

type FileRowContextMenuProps = {
  file: LibraryFile;
  anchor: FileRowMenuAnchor;
  onDismiss: () => void;
  onDelete: (file: LibraryFile) => void;
  onEditTags: (file: LibraryFile) => void;
  onReplace: (file: LibraryFile) => void;
};

/** Right-click menu for a file row, anchored at the pointer (rows carry no kebab button). */
export function FileRowContextMenu({
  file,
  anchor,
  onDismiss,
  onDelete,
  onEditTags,
  onReplace,
}: FileRowContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!menuRef.current) {
      return;
    }

    setMenuPosition(getMenuPosition(anchor, menuRef.current));
  }, [anchor]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      onDismiss();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onDismiss();
      }
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

  if (typeof document === "undefined") {
    return null;
  }

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md"
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
          onEditTags(file);
        }}
        role="menuitem"
        type="button"
      >
        <IconTag aria-hidden className="size-4" stroke={2.2} />
        Edit tags
      </button>

      <button
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
        onClick={() => {
          onDismiss();
          onReplace(file);
        }}
        role="menuitem"
        type="button"
      >
        <IconReplace aria-hidden className="size-4" stroke={2.2} />
        Replace
      </button>

      <button
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
        onClick={() => {
          onDismiss();
          onDelete(file);
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
