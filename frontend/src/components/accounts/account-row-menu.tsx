"use client";

import {
  IconDotsVertical,
  IconRefresh,
  IconShield,
  IconShieldOff,
  IconUserOff,
  IconUserPlus,
} from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import type { Account } from "@/lib/accounts/types";
import { cn } from "@/lib/utils";

type AccountRowMenuProps = {
  account: Account;
  onResetPin: (account: Account) => void;
  onGrantAdmin: (account: Account) => void;
  onRevokeAdmin: (account: Account) => void;
  onDeactivate: (account: Account) => void;
  onReactivate: (account: Account) => void;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(
  trigger: HTMLElement,
  menu: HTMLElement
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
    window.innerWidth - menuRect.width - viewportPadding
  );

  return { top, left };
}

export function AccountRowMenu({
  account,
  onResetPin,
  onGrantAdmin,
  onRevokeAdmin,
  onDeactivate,
  onReactivate,
}: AccountRowMenuProps) {
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

  const canDeactivate = account.is_active && !account.is_primary_admin;
  const canGrantAdmin = account.is_active && account.role === "staff";
  const canRevokeAdmin =
    account.is_active && account.role === "admin" && !account.is_primary_admin;

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
            onResetPin(account);
          }}
          role="menuitem"
          type="button"
        >
          <IconRefresh aria-hidden="true" className="size-4" stroke={2.2} />
          Reset PIN
        </button>

        {canGrantAdmin ? (
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onGrantAdmin(account);
            }}
            role="menuitem"
            type="button"
          >
            <IconShield aria-hidden="true" className="size-4" stroke={2.2} />
            Make admin
          </button>
        ) : null}

        {canRevokeAdmin ? (
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onRevokeAdmin(account);
            }}
            role="menuitem"
            type="button"
          >
            <IconShieldOff aria-hidden="true" className="size-4" stroke={2.2} />
            Remove admin
          </button>
        ) : null}

        {account.is_active ? (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
              canDeactivate
                ? "text-destructive hover:bg-destructive/10"
                : "cursor-not-allowed text-muted-foreground opacity-50"
            )}
            disabled={!canDeactivate}
            onClick={() => {
              if (!canDeactivate) {
                return;
              }

              setOpen(false);
              onDeactivate(account);
            }}
            role="menuitem"
            title={
              account.is_primary_admin
                ? "The primary admin cannot be deactivated"
                : undefined
            }
            type="button"
          >
            <IconUserOff aria-hidden="true" className="size-4" stroke={2.2} />
            Deactivate
          </button>
        ) : (
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onReactivate(account);
            }}
            role="menuitem"
            type="button"
          >
            <IconUserPlus aria-hidden="true" className="size-4" stroke={2.2} />
            Reactivate
          </button>
        )}
      </div>
    ) : null;

  return (
    <div className="flex justify-end" ref={triggerRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${account.username}`}
        onClick={() => setOpen((current) => !current)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <IconDotsVertical aria-hidden="true" className="size-4" stroke={2.2} />
      </Button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
