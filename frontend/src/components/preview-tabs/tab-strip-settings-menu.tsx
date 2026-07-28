"use client";

import { IconCheck, IconDots } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import type { OverflowMode } from "@/lib/preview-tabs/types";

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

type TabStripSettingsMenuProps = {
  overflowMode: OverflowMode;
  onSetOverflowMode: (mode: OverflowMode) => void;
};

const ITEM_CLASS =
  "flex w-full items-center justify-between gap-4 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted";

export function TabStripSettingsMenu({
  overflowMode,
  onSetOverflowMode,
}: TabStripSettingsMenuProps) {
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
        <button
          aria-checked={overflowMode === "scroll"}
          className={ITEM_CLASS}
          onClick={() => {
            setOpen(false);
            onSetOverflowMode("scroll");
          }}
          role="menuitemradio"
          type="button"
        >
          Scroll
          {overflowMode === "scroll" ? (
            <IconCheck aria-hidden className="size-4" stroke={2.2} />
          ) : null}
        </button>
        <button
          aria-checked={overflowMode === "pagination"}
          className={ITEM_CLASS}
          onClick={() => {
            setOpen(false);
            onSetOverflowMode("pagination");
          }}
          role="menuitemradio"
          type="button"
        >
          Pagination
          {overflowMode === "pagination" ? (
            <IconCheck aria-hidden className="size-4" stroke={2.2} />
          ) : null}
        </button>
      </div>
    ) : null;

  return (
    <div className="flex shrink-0 items-center" ref={triggerRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Tab strip settings"
        onClick={() => setOpen((current) => !current)}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <IconDots aria-hidden className="size-4" stroke={2.2} />
      </Button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
