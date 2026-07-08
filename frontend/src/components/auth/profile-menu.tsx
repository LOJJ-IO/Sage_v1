"use client";

import {
  IconCheck,
  IconUser,
} from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";
import { getUserRole } from "@/lib/auth/session";
import { type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICON_SIZE = 20;
const ICON_STROKE = 2.2;
const VIEWPORT_PADDING = 8;
const MENU_GAP = 4;
const SUBMENU_GAP = 4;
const SUBMENU_LINGER_MS = 1000;

type MenuPosition = {
  top: number;
  left: number;
};

type AppearanceOption = {
  value: ThemePreference;
  label: string;
  description: string;
};

const APPEARANCE_OPTIONS: AppearanceOption[] = [
  { value: "light", label: "Light", description: "Always use light mode" },
  { value: "dark", label: "Dark", description: "Always use dark mode" },
  { value: "system", label: "Match system", description: "Follow device setting" },
];

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
  submenuWidth: number,
): MenuPosition {
  const triggerRect = trigger.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const totalWidth = menuRect.width + (submenuWidth > 0 ? submenuWidth + SUBMENU_GAP : 0);

  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const openUpward =
    spaceBelow < menuRect.height + MENU_GAP && spaceAbove > spaceBelow;

  const top = openUpward
    ? triggerRect.top - menuRect.height - MENU_GAP
    : triggerRect.bottom + MENU_GAP;

  const left = Math.min(
    Math.max(VIEWPORT_PADDING, triggerRect.right - totalWidth),
    window.innerWidth - totalWidth - VIEWPORT_PADDING,
  );

  return { top, left };
}

export function ProfileMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [appearanceOffset, setAppearanceOffset] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const appearanceItemRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const appearanceCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const cancelAppearanceClose = () => {
    if (appearanceCloseTimeoutRef.current) {
      clearTimeout(appearanceCloseTimeoutRef.current);
      appearanceCloseTimeoutRef.current = null;
    }
  };

  const openAppearance = () => {
    cancelAppearanceClose();
    setAppearanceOpen(true);
  };

  const scheduleAppearanceClose = () => {
    cancelAppearanceClose();
    appearanceCloseTimeoutRef.current = setTimeout(() => {
      setAppearanceOpen(false);
      appearanceCloseTimeoutRef.current = null;
    }, SUBMENU_LINGER_MS);
  };

  useEffect(() => {
    return () => {
      cancelAppearanceClose();
    };
  }, []);

  useEffect(() => {
    const role = getUserRole();
    setIsAdmin(role === "admin" || role === null);
  }, [open]);

  const updateMenuPosition = () => {
    if (!triggerRef.current || !menuRef.current) {
      return;
    }

    const submenuWidth =
      appearanceOpen && submenuRef.current
        ? submenuRef.current.getBoundingClientRect().width
        : 0;

    setMenuPosition(
      getMainMenuPosition(triggerRef.current, menuRef.current, submenuWidth),
    );

    if (appearanceItemRef.current && menuRef.current) {
      const itemRect = appearanceItemRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      setAppearanceOffset(itemRect.top - menuRect.top);
    }
  };

  useLayoutEffect(() => {
    if (!open) {
      cancelAppearanceClose();
      setMenuPosition(null);
      setAppearanceOpen(false);
      return;
    }

    updateMenuPosition();
  }, [open, appearanceOpen, isAdmin]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        submenuRef.current?.contains(target)
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
  }, [open, appearanceOpen]);

  const closeMenu = () => {
    cancelAppearanceClose();
    setOpen(false);
    setAppearanceOpen(false);
  };

  const menu =
    open && typeof document !== "undefined" ? (
      <div
        className="fixed z-50 flex items-start"
        style={
          menuPosition
            ? { top: menuPosition.top, left: menuPosition.left }
            : { top: -9999, left: -9999, visibility: "hidden" }
        }
      >
        {appearanceOpen ? (
          <div
            ref={submenuRef}
            className="min-w-44 rounded-lg border border-border bg-popover p-1 shadow-md"
            onMouseEnter={openAppearance}
            onMouseLeave={(event) => {
              const next = event.relatedTarget as Node | null;
              if (
                submenuRef.current?.contains(next) ||
                appearanceItemRef.current?.contains(next)
              ) {
                return;
              }

              scheduleAppearanceClose();
            }}
            role="menu"
            style={{ marginRight: SUBMENU_GAP, marginTop: appearanceOffset }}
          >
            {APPEARANCE_OPTIONS.map((option) => {
              const selected = theme === option.value;

              return (
                <button
                  key={option.value}
                  className={menuItemClass(selected)}
                  onClick={() => {
                    setTheme(option.value);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  {selected ? (
                    <IconCheck
                      aria-hidden="true"
                      className="size-4 shrink-0"
                      stroke={2.2}
                    />
                  ) : (
                    <span aria-hidden="true" className="size-4 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          ref={menuRef}
          className="min-w-52 rounded-lg border border-border bg-popover p-1 shadow-md"
          role="menu"
        >
          <button
            ref={appearanceItemRef}
            aria-expanded={appearanceOpen}
            aria-haspopup="menu"
            className={menuItemClass(appearanceOpen)}
            onMouseEnter={openAppearance}
            onMouseLeave={(event) => {
              const next = event.relatedTarget as Node | null;
              if (submenuRef.current?.contains(next)) {
                return;
              }

              scheduleAppearanceClose();
            }}
            onFocus={openAppearance}
            role="menuitem"
            type="button"
          >
            Appearance
          </button>

          <div className="my-1 h-px bg-border" role="separator" />

          <button
            className={menuItemClass()}
            onClick={closeMenu}
            role="menuitem"
            type="button"
          >
            Reset PIN
          </button>

          {isAdmin ? (
            <button
              className={menuItemClass()}
              onClick={closeMenu}
              role="menuitem"
              type="button"
            >
              Manage team
            </button>
          ) : null}

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
      </div>
    ) : null;

  return (
    <div ref={triggerRef}>
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger
          render={
            <button
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label="Profile"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => setOpen((current) => !current)}
              type="button"
            />
          }
        >
          <TablerIcon icon={IconUser} />
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8} variant="compact">
          Profile
        </TooltipContent>
      </Tooltip>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
