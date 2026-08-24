"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ContextMenuAnchor = { x: number; y: number };

type MenuPosition = { top: number; left: number };

function getMenuPosition(anchor: ContextMenuAnchor, menu: HTMLElement): MenuPosition {
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

type ContextMenuPortalProps = {
  anchor: ContextMenuAnchor;
  onDismiss: () => void;
  children: ReactNode;
};

/** Shared right-click-menu chrome: two-pass off-screen measure-then-place
 * (avoids a flash at the wrong spot), portal to `document.body`, dismiss on
 * outside pointerdown / Escape / resize / scroll. Mirrors the mechanics of
 * `FileRowContextMenu`/`FolderRowContextMenu`/`PreviewTabContextMenu` —
 * those three keep their own copies (working code, not worth touching), but
 * a fourth near-identical menu is the "boundaries have stabilized" signal
 * this repo's own UI-UX-Guidelines calls for extracting on. New blank-area
 * menus build on this instead of copying the pattern a fourth+ time. */
export function ContextMenuPortal({ anchor, onDismiss, children }: ContextMenuPortalProps) {
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
      ref={menuRef}
      className="fixed z-50 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md"
      role="menu"
      style={
        menuPosition
          ? { top: menuPosition.top, left: menuPosition.left }
          : { top: -9999, left: -9999, visibility: "hidden" }
      }
    >
      {children}
    </div>
  );

  return createPortal(menu, document.body);
}

type ContextMenuItemProps = {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

/** One menu row. `onSelect` should itself call the menu's dismiss handler
 * before/after acting, as the caller sees fit — this component doesn't
 * assume one order, it just renders the row. */
export function ContextMenuItem({ icon, label, onSelect, destructive = false }: ContextMenuItemProps) {
  return (
    <button
      className={
        destructive
          ? "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          : "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
      }
      onClick={onSelect}
      role="menuitem"
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
