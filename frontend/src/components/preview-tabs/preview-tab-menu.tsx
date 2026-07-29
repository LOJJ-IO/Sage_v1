"use client";

import {
  IconCopy,
  IconPin,
  IconPinnedOff,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ContextMenuAnchor = {
  x: number;
  y: number;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(
  anchor: ContextMenuAnchor,
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

type PreviewTabContextMenuProps = {
  open: boolean;
  anchor: ContextMenuAnchor | null;
  onDismiss: () => void;
  pinned: boolean;
  canClose: boolean;
  canDuplicate: boolean;
  canUnpin: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onDuplicate: () => void;
  onClose: () => void;
};

const ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted";
const DISABLED_ITEM_CLASS =
  "flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground opacity-50";
const DESTRUCTIVE_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10";

/** Right-click menu for a tab, anchored at the pointer (Chrome-style — tabs carry no kebab button). */
export function PreviewTabContextMenu({
  open,
  anchor,
  onDismiss,
  pinned,
  canClose,
  canDuplicate,
  canUnpin,
  onPin,
  onUnpin,
  onDuplicate,
  onClose,
}: PreviewTabContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) {
      setMenuPosition(null);
      return;
    }

    setMenuPosition(getMenuPosition(anchor, menuRef.current));
  }, [open, anchor]);

  useEffect(() => {
    if (!open) {
      return;
    }

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
  }, [open, onDismiss]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-40 rounded-lg border border-border bg-popover p-1 shadow-md"
      role="menu"
      style={
        menuPosition
          ? { top: menuPosition.top, left: menuPosition.left }
          : { top: -9999, left: -9999, visibility: "hidden" }
      }
    >
      {pinned ? (
        <button
          aria-disabled={!canUnpin}
          className={canUnpin ? ITEM_CLASS : DISABLED_ITEM_CLASS}
          disabled={!canUnpin}
          onClick={() => {
            onDismiss();
            onUnpin();
          }}
          role="menuitem"
          type="button"
        >
          <IconPinnedOff aria-hidden className="size-4" stroke={2.2} />
          Unpin
        </button>
      ) : (
        <button
          className={ITEM_CLASS}
          onClick={() => {
            onDismiss();
            onPin();
          }}
          role="menuitem"
          type="button"
        >
          <IconPin aria-hidden className="size-4" stroke={2.2} />
          Pin
        </button>
      )}

      <button
        aria-disabled={!canDuplicate}
        className={canDuplicate ? ITEM_CLASS : DISABLED_ITEM_CLASS}
        onClick={() => {
          if (!canDuplicate) return;
          onDismiss();
          onDuplicate();
        }}
        role="menuitem"
        type="button"
      >
        <IconCopy aria-hidden className="size-4" stroke={2.2} />
        Duplicate
      </button>

      <button
        aria-disabled={!canClose}
        className={canClose ? DESTRUCTIVE_ITEM_CLASS : DISABLED_ITEM_CLASS}
        onClick={() => {
          if (!canClose) return;
          onDismiss();
          onClose();
        }}
        role="menuitem"
        type="button"
      >
        <IconX aria-hidden className="size-4" stroke={2.2} />
        Close
      </button>
    </div>
  );

  return createPortal(menu, document.body);
}
