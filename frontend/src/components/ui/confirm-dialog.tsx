"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogSize,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: DialogSize;
  title: string;
  description?: ReactNode;
  safeExitLabel?: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  isConfirming?: boolean;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  size = "sm",
  title,
  description,
  safeExitLabel = "Cancel",
  confirmLabel,
  onConfirm,
  isConfirming = false,
  destructive = true,
}: ConfirmDialogProps) {
  const handleSafeExit = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleConfirm = useCallback(async () => {
    await onConfirm();
    onOpenChange(false);
  }, [onConfirm, onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent kind="confirm" onSafeExit={handleSafeExit} size={size} variant="shell">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <DialogFooter>
          <Button
            autoFocus={open}
            disabled={isConfirming}
            onClick={handleSafeExit}
            type="button"
            variant="outline"
          >
            {safeExitLabel}
          </Button>
          <Button
            disabled={isConfirming}
            onClick={() => void handleConfirm()}
            type="button"
            variant={destructive ? "destructive" : "default"}
          >
            {isConfirming ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
