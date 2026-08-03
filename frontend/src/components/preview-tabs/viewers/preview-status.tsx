"use client";

import { IconAlertTriangle } from "@tabler/icons-react";

import { EmptyState } from "@/components/ui/empty";

const ICON_SIZE = 16;

export function PreviewLoadingSkeleton() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
      <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

export function PreviewFetchError({ message }: { message: string }) {
  return (
    <EmptyState
      className="h-full px-4"
      description={message}
      icon={<IconAlertTriangle aria-hidden size={ICON_SIZE} stroke={2.2} />}
      mediaClassName="bg-destructive/10 text-destructive"
      title="Could not load preview"
    />
  );
}
