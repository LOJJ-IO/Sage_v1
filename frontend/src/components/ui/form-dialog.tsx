"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogSize,
} from "@/components/ui/dialog";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: DialogSize;
  title: string;
  description?: string;
  onDiscard: () => void;
  onSave: () => void | Promise<void>;
  isSaving?: boolean;
  children: ReactNode;
  bodyClassName?: string;
};

export function FormDialog({
  open,
  onOpenChange,
  size = "sm",
  title,
  description,
  onDiscard,
  onSave,
  isSaving = false,
  children,
  bodyClassName,
}: FormDialogProps) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onDiscard();
      }
      onOpenChange(nextOpen);
    },
    [onDiscard, onOpenChange]
  );

  const handleDiscard = useCallback(() => {
    onDiscard();
    onOpenChange(false);
  }, [onDiscard, onOpenChange]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await onSave();
      onOpenChange(false);
    },
    [onSave, onOpenChange]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent kind="form" onSafeExit={handleDiscard} size={size} variant="shell">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>

          <DialogBody className={bodyClassName}>{children}</DialogBody>

          <DialogFooter>
            <Button
              disabled={isSaving}
              onClick={handleDiscard}
              type="button"
              variant="outline"
            >
              Discard
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
