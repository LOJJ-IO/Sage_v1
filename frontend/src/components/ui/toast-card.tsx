"use client";

import {
  IconAlertCircle,
  IconCircleCheck,
  IconCloudUpload,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import type { ToastRecord } from "@/lib/toast/types";
import { cn } from "@/lib/utils";

const VARIANT_ICON = {
  success: IconCircleCheck,
  error: IconAlertCircle,
  info: IconInfoCircle,
  progress: IconCloudUpload,
} as const;

const VARIANT_ICON_CLASS = {
  success: "text-emerald-600",
  error: "text-destructive",
  info: "text-foreground",
  progress: "text-foreground",
} as const;

type ToastCardProps = {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
};

export function ToastCard({
  toast,
  onDismiss,
  onPause,
  onResume,
}: ToastCardProps) {
  const Icon = VARIANT_ICON[toast.variant];

  return (
    <div
      className="group pointer-events-auto relative w-full rounded-2xl border border-border bg-card px-3 py-2 shadow-lg"
      onMouseEnter={() => onPause(toast.id)}
      onMouseLeave={() => onResume(toast.id)}
      role="status"
    >
      <Button
        aria-label="Dismiss"
        className="absolute -top-1.5 -left-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => onDismiss(toast.id)}
        size="icon-xs"
        type="button"
        variant="outline"
      >
        <IconX aria-hidden="true" stroke={2.2} />
      </Button>

      <div className="flex items-start gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn("mt-0.5 size-5 shrink-0", VARIANT_ICON_CLASS[toast.variant])}
          stroke={2.2}
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
          {toast.description ? (
            <p className="text-sm text-muted-foreground">{toast.description}</p>
          ) : null}

          {toast.variant === "progress" && toast.progress !== undefined ? (
            <div className="space-y-1.5 pt-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, toast.progress))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(toast.progress)}%
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
