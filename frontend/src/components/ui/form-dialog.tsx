"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { ShellDialog } from "@/components/ui/shell-dialog";
import type { DialogSize } from "@/components/ui/dialog";

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
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
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
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
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
    <ShellDialog
      bodyClassName={bodyClassName}
      className={className}
      description={description}
      footer={
        <>
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
        </>
      }
      footerClassName={footerClassName}
      headerClassName={headerClassName}
      kind="form"
      onOpenChange={handleOpenChange}
      onSafeExit={handleDiscard}
      onSubmit={handleSubmit}
      open={open}
      size={size}
      title={title}
    >
      {children}
    </ShellDialog>
  );
}
