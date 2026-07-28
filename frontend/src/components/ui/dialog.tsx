"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IconX } from "@tabler/icons-react";
import { createContext, useContext, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DialogKind = "form" | "confirm";
export type DialogSize = "sm" | "lg" | "xl";
type DialogVariant = "shell" | "legacy";

const DialogVariantContext = createContext<DialogVariant>("legacy");

function DialogVariantProvider({
  variant,
  children,
}: {
  variant: DialogVariant;
  children: ReactNode;
}) {
  return (
    <DialogVariantContext.Provider value={variant}>
      {children}
    </DialogVariantContext.Provider>
  );
}

function useDialogVariant() {
  return useContext(DialogVariantContext);
}

const DIALOG_SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
};

const DIALOG_SHELL_CLASS =
  "flex max-h-[min(80vh,32rem)] min-h-[20rem] flex-col gap-0 overflow-hidden p-0";

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

type DialogContentProps = {
  className?: string;
  children: ReactNode;
  variant?: "shell" | "legacy";
  kind?: DialogKind;
  size?: DialogSize;
  onSafeExit?: () => void;
};

function DialogContent({
  className,
  children,
  variant = "legacy",
  kind = "form",
  size = "sm",
  onSafeExit,
}: DialogContentProps) {
  const handleClose = () => {
    onSafeExit?.();
  };

  if (variant === "legacy") {
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-lg outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            className
          )}
        >
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <IconX aria-hidden="true" className="size-4" stroke={2.2} />
          </DialogPrimitive.Close>
          <DialogVariantProvider variant="legacy">
            {children}
          </DialogVariantProvider>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    );
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <DialogPrimitive.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-lg outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          DIALOG_SHELL_CLASS,
          DIALOG_SIZE_CLASS[size],
          className
        )}
      >
        <DialogPrimitive.Close
          aria-label={kind === "form" ? "Discard changes" : "Cancel"}
          className="absolute top-4 right-4 z-10 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={handleClose}
        >
          <IconX aria-hidden="true" className="size-4" stroke={2.2} />
        </DialogPrimitive.Close>
        <DialogVariantProvider variant="shell">{children}</DialogVariantProvider>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const variant = useDialogVariant();

  return (
    <div
      className={cn(
        variant === "shell"
          ? "shrink-0 space-y-1.5 border-b border-border px-6 py-5 pr-14"
          : "mb-4 space-y-1.5 pr-8",
        className
      )}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-heading text-lg font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const variant = useDialogVariant();

  return (
    <div
      className={cn(
        variant === "shell"
          ? "flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4"
          : "mt-6 flex justify-end gap-2",
        className
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
