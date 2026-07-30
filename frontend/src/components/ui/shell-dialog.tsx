"use client";

import type { FormEvent, ReactNode } from "react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogKind,
  type DialogSize,
} from "@/components/ui/dialog";

type ShellDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: DialogSize;
  kind?: DialogKind;
  title: string;
  description?: ReactNode;
  onSafeExit?: () => void;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  headerExtra?: ReactNode;
  footer: ReactNode;
  children?: ReactNode;
  /** When set, wraps header/body/footer in a `<form>`. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

/**
 * Shared dialog shell chrome (bordered header + scroll body + bordered footer).
 * Spacing comes from `--dialog-shell-*` tokens in `globals.css`.
 * Prefer this over hand-rolling `variant="shell"` layout.
 */
export function ShellDialog({
  open,
  onOpenChange,
  size = "sm",
  kind = "form",
  title,
  description,
  onSafeExit,
  className,
  bodyClassName,
  headerClassName,
  footerClassName,
  headerExtra,
  footer,
  children,
  onSubmit,
}: ShellDialogProps) {
  const chrome = (
    <>
      <DialogHeader className={headerClassName}>
        <DialogTitle title={title}>{title}</DialogTitle>
        {description ? (
          <DialogDescription className="min-w-0">{description}</DialogDescription>
        ) : null}
        {headerExtra}
      </DialogHeader>

      {children != null ? (
        <DialogBody className={bodyClassName}>{children}</DialogBody>
      ) : null}

      <DialogFooter className={footerClassName}>{footer}</DialogFooter>
    </>
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={className}
        kind={kind}
        onSafeExit={onSafeExit}
        size={size}
        variant="shell"
      >
        {onSubmit ? (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={onSubmit}
          >
            {chrome}
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">{chrome}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
