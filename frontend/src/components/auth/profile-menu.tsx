"use client";

import { IconUser } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ICON_SIZE = 20;
const ICON_STROKE = 2.2;
const VIEWPORT_PADDING = 8;
const MENU_GAP = 4;

type MenuPosition = {
  top: number;
  left: number;
};

function TablerIcon({
  icon: Icon,
  size = ICON_SIZE,
}: {
  icon: typeof IconUser;
  size?: number;
}) {
  return (
    <Icon
      aria-hidden="true"
      className="shrink-0"
      size={size}
      stroke={ICON_STROKE}
    />
  );
}

function menuItemClass(active = false) {
  return cn(
    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted",
    active && "bg-muted",
  );
}

function getMainMenuPosition(
  trigger: HTMLElement,
  menu: HTMLElement,
): MenuPosition {
  const triggerRect = trigger.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();

  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const openUpward =
    spaceBelow < menuRect.height + MENU_GAP && spaceAbove > spaceBelow;

  const top = openUpward
    ? triggerRect.top - menuRect.height - MENU_GAP
    : triggerRect.bottom + MENU_GAP;

  const left = Math.min(
    Math.max(VIEWPORT_PADDING, triggerRect.right - menuRect.width),
    window.innerWidth - menuRect.width - VIEWPORT_PADDING,
  );

  return { top, left };
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = () => {
    if (!triggerRef.current || !menuRef.current) {
      return;
    }

    setMenuPosition(
      getMainMenuPosition(triggerRef.current, menuRef.current),
    );
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

  const closeMenu = () => {
    setOpen(false);
  };

  const toggleMenu = () => {
    setOpen((current) => {
      const next = !current;
      if (next) {
        setTooltipOpen(false);
      }
      return next;
    });
  };

  const menu =
    open && typeof document !== "undefined" ? (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-52 rounded-lg border border-border bg-popover p-1 shadow-md"
        role="menu"
        style={
          menuPosition
            ? { top: menuPosition.top, left: menuPosition.left }
            : { top: -9999, left: -9999, visibility: "hidden" }
        }
      >
        <button
          className={menuItemClass()}
          onClick={closeMenu}
          role="menuitem"
          type="button"
        >
          Reset PIN
        </button>

        <div className="my-1 h-px bg-border" role="separator" />

        <button
          className={menuItemClass()}
          onClick={closeMenu}
          role="menuitem"
          type="button"
        >
          Learn more
        </button>
      </div>
    ) : null;

  return (
    <div ref={triggerRef}>
      <Tooltip
        open={open ? false : tooltipOpen}
        onOpenChange={(next) => {
          if (!open) {
            setTooltipOpen(next);
          }
        }}
      >
        <TooltipTrigger
          render={
            <button
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label="Profile"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={toggleMenu}
              type="button"
            />
          }
        >
          <TablerIcon icon={IconUser} />
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8} variant="compact">
          Profile
        </TooltipContent>
      </Tooltip>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
