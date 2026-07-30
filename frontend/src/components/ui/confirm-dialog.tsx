"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { ShellDialog } from "@/components/ui/shell-dialog";
import type { DialogSize } from "@/components/ui/dialog";

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
    <ShellDialog
      description={description}
      footer={
        <>
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
        </>
      }
      kind="confirm"
      onOpenChange={onOpenChange}
      onSafeExit={handleSafeExit}
      open={open}
      size={size}
      title={title}
    />
  );
}
