"use client";

import {
  IconDotsVertical,
  IconReplace,
  IconTag,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import type { LibraryFile } from "@/lib/file-upload";

type FileRowMenuProps = {
  file: LibraryFile;
  onDelete: (file: LibraryFile) => void;
  onEditTags: (file: LibraryFile) => void;
  onReplace: (file: LibraryFile) => void;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(
  trigger: HTMLElement,
  menu: HTMLElement,
): MenuPosition {
  const triggerRect = trigger.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const gap = 4;
  const viewportPadding = 8;

  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const openUpward =
    spaceBelow < menuRect.height + gap && spaceAbove > spaceBelow;

  const top = openUpward
    ? triggerRect.top - menuRect.height - gap
    : triggerRect.bottom + gap;

  const left = Math.min(
    Math.max(viewportPadding, triggerRect.right - menuRect.width),
    window.innerWidth - menuRect.width - viewportPadding,
  );

  return { top, left };
}

export function FileRowMenu({
  file,
  onDelete,
  onEditTags,
  onReplace,
}: FileRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = () => {
    if (!triggerRef.current || !menuRef.current) {
      return;
    }

    setMenuPosition(getMenuPosition(triggerRef.current, menuRef.current));
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handleReposition = () => {
      updateMenuPosition();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  const menu =
    open && typeof document !== "undefined" ? (
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
            setOpen(false);
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
            setOpen(false);
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
            setOpen(false);
            onDelete(file);
          }}
          role="menuitem"
          type="button"
        >
          <IconTrash aria-hidden className="size-4" stroke={2.2} />
          Delete
        </button>
      </div>
    ) : null;

  return (
    <div className="flex justify-end" ref={triggerRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${file.file.name}`}
        onClick={() => setOpen((current) => !current)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <IconDotsVertical aria-hidden className="size-4" stroke={2.2} />
      </Button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
