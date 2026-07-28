"use client";

import {
  IconCopy,
  IconDots,
  IconPin,
  IconPinnedOff,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

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

type PreviewTabMenuProps = {
  title: string;
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

export function PreviewTabMenu({
  title,
  pinned,
  canClose,
  canDuplicate,
  canUnpin,
  onPin,
  onUnpin,
  onDuplicate,
  onClose,
}: PreviewTabMenuProps) {
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
              setOpen(false);
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
              setOpen(false);
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
            setOpen(false);
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
            setOpen(false);
            onClose();
          }}
          role="menuitem"
          type="button"
        >
          <IconX aria-hidden className="size-4" stroke={2.2} />
          Close
        </button>
      </div>
    ) : null;

  return (
    <div className="flex shrink-0 justify-end" ref={triggerRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${title}`}
        onClick={() => setOpen((current) => !current)}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <IconDots aria-hidden className="size-3.5" stroke={2.2} />
      </Button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
