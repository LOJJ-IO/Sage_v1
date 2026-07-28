"use client";

import { IconPin } from "@tabler/icons-react";

import { PreviewFileTypeIcon } from "@/components/preview-tabs/preview-file-type-icon";
import "./preview-tab-chrome.css";
import { PreviewTabMenu } from "@/components/preview-tabs/preview-tab-menu";
import { TruncatedFilenameText } from "@/components/preview-tabs/truncated-filename";
import type { TabCompression } from "@/components/preview-tabs/use-tab-lane-compression";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  canCloseTab,
  canDuplicateTab,
  canUnpinTab,
} from "@/lib/preview-tabs/selectors";
import type { PreviewTab as PreviewTabType } from "@/lib/preview-tabs/types";
import { cn } from "@/lib/utils";

/** Uniform tab chrome width — active and inactive share the same footprint. */
const TAB_WIDTH_CLASS: Record<TabCompression, string> = {
  normal: "w-[7.75rem] max-w-[7.75rem]",
  compact: "w-[6.5rem] max-w-[6.5rem]",
  "icon-only": "w-14 max-w-14",
};

type PreviewTabProps = {
  tab: PreviewTabType;
  isActive: boolean;
  /** Rightmost visible tab before settings — omit bottom-right fillet. */
  trailsViewport?: boolean;
  compression: TabCompression;
  onSelect: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onDuplicate: () => void;
  onClose: () => void;
};

export function PreviewTab({
  tab,
  isActive,
  trailsViewport = false,
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
        "group relative shrink-0",
        TAB_WIDTH_CLASS[compression],
        isActive
          ? "preview-tab-shaped"
          : "preview-tab-inactive h-9 self-end border-r border-border bg-transparent text-muted-foreground last:border-r-0",
        trailsViewport && isActive && "preview-tab--no-right-fillet",
        isRemoved && "opacity-70",
        isIconOnly
          ? "text-sm"
          : compression === "compact"
            ? "text-xs"
            : "text-sm",
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-selected={isActive}
              className={cn(
                "absolute inset-y-0 left-0 right-7 z-0 flex min-w-0 cursor-pointer items-center gap-1 overflow-hidden text-left",
                isIconOnly ? "px-1" : compression === "compact" ? "px-1.5" : "px-2",
              )}
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
                  : isActive
                    ? "shrink-0 text-foreground"
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
            <TruncatedFilenameText
              className="min-w-0 flex-1"
              title={tab.title}
            />
          ) : null}
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} variant="compact">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>

      <div className="absolute inset-y-0 right-0 z-10 flex w-7 items-center justify-center">
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
    </div>
  );
}
