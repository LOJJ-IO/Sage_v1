"use client";

import { IconPin } from "@tabler/icons-react";

import { PreviewFileTypeIcon } from "@/components/preview-tabs/preview-file-type-icon";
import { PreviewTabMenu } from "@/components/preview-tabs/preview-tab-menu";
import type { TabCompression } from "@/components/preview-tabs/use-tab-lane-compression";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  canCloseTab,
  canDuplicateTab,
  canUnpinTab,
} from "@/lib/preview-tabs/selectors";
import type { PreviewTab as PreviewTabType } from "@/lib/preview-tabs/types";
import { cn } from "@/lib/utils";

type PreviewTabProps = {
  tab: PreviewTabType;
  isActive: boolean;
  compression: TabCompression;
  onSelect: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onDuplicate: () => void;
  onClose: () => void;
};

function tabMaxWidth(
  isActive: boolean,
  compression: TabCompression,
): string {
  if (compression === "icon-only") {
    return "max-w-20";
  }
  if (compression === "compact") {
    return isActive ? "max-w-44" : "max-w-32";
  }
  return isActive ? "max-w-64" : "max-w-40";
}

export function PreviewTab({
  tab,
  isActive,
  compression,
  onSelect,
  onPin,
  onUnpin,
  onDuplicate,
  onClose,
}: PreviewTabProps) {
  const isRemoved = tab.lifecycle === "removed";
  const isIconOnly = compression === "icon-only";
  const showTitle = !isIconOnly;
  const tooltipLabel = isRemoved ? `${tab.title} (removed)` : tab.title;

  return (
    <div
      className={cn(
        "group flex min-w-0 items-center gap-0.5 rounded-t-md border border-transparent",
        tabMaxWidth(isActive, compression),
        isActive
          ? "z-10 -mb-px min-w-24 border-border border-b-0 bg-background text-foreground"
          : "min-w-16 bg-transparent text-muted-foreground hover:bg-muted/60",
        isRemoved && "opacity-70",
        isIconOnly
          ? "px-1 py-1.5"
          : compression === "compact"
            ? "px-2 py-1 text-xs"
            : "px-2.5 py-1.5 text-sm",
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-selected={isActive}
              className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-left"
              onClick={onSelect}
              role="tab"
              type="button"
            />
          }
        >
          {isIconOnly && tab.pinned ? (
            <IconPin
              aria-hidden
              className="size-3.5 shrink-0 text-muted-foreground"
              stroke={2.2}
            />
          ) : (
            <PreviewFileTypeIcon
              className={
                isRemoved
                  ? "shrink-0 text-destructive"
                  : "shrink-0 text-muted-foreground"
              }
              fileType={tab.fileType}
              title={tab.title}
            />
          )}
          {tab.pinned && showTitle ? (
            <IconPin
              aria-hidden
              className="size-3 shrink-0 text-muted-foreground"
              stroke={2.2}
            />
          ) : null}
          {showTitle ? (
            <span className="min-w-0 flex-1 truncate">{tab.title}</span>
          ) : null}
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} variant="compact">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>

      <PreviewTabMenu
        canClose={canCloseTab(tab)}
        canDuplicate={canDuplicateTab(tab)}
        canUnpin={canUnpinTab(tab)}
        onClose={onClose}
        onDuplicate={onDuplicate}
        onPin={onPin}
        onUnpin={onUnpin}
        pinned={tab.pinned}
        title={tab.title}
      />
    </div>
  );
}
