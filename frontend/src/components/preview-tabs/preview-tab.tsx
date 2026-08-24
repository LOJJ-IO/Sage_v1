"use client";

import { IconPin, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { PreviewFileTypeIcon } from "@/components/preview-tabs/preview-file-type-icon";
import "./preview-tab-chrome.css";
import {
  PreviewTabContextMenu,
  type ContextMenuAnchor,
} from "@/components/preview-tabs/preview-tab-menu";
import { TruncatedFilenameText } from "@/components/preview-tabs/truncated-filename";
import { TAB_MAX_WIDTH_PX } from "@/components/ui/tab-chrome";
import { Button } from "@/components/ui/button";
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
  onSelect: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onDuplicate: () => void;
  onClose: () => void;
};

export function PreviewTab({
  tab,
  isActive,
  onSelect,
  onPin,
  onUnpin,
  onDuplicate,
  onClose,
}: PreviewTabProps) {
  const [menuAnchor, setMenuAnchor] = useState<ContextMenuAnchor | null>(null);
  const isRemoved = tab.lifecycle === "removed";
  const closable = canCloseTab(tab);
  const showTrailingAction = closable || tab.pinned;
  const tooltipLabel = isRemoved ? `${tab.title} (removed)` : tab.title;

  return (
    <div
      className={cn(
        "preview-tab-chrome group relative w-full min-w-8 shrink-0 text-sm",
        isActive
          ? "preview-tab-shaped"
          : "preview-tab-inactive h-9 bg-transparent text-muted-foreground",
        isRemoved && "opacity-70",
      )}
      style={{ width: TAB_MAX_WIDTH_PX }}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuAnchor({ x: event.clientX, y: event.clientY });
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-selected={isActive}
              className={cn(
                "absolute inset-y-0 left-0 z-0 flex min-w-0 cursor-pointer items-center gap-1 overflow-hidden px-2 text-left",
                showTrailingAction ? "right-7" : "right-2",
              )}
              onClick={onSelect}
              role="tab"
              type="button"
            />
          }
        >
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
          <TruncatedFilenameText className="min-w-0 flex-1" title={tab.title} />
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} variant="compact">
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>

      {showTrailingAction ? (
        <div
          className={cn(
            "absolute inset-y-0 right-0 z-10 flex w-7 items-center justify-center",
            !isActive && closable && "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
          )}
        >
          <Button
            aria-label={tab.pinned ? `Unpin ${tab.title}` : `Close ${tab.title}`}
            onClick={tab.pinned ? onUnpin : onClose}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            {tab.pinned ? (
              <IconPin aria-hidden className="size-3.5" stroke={2.2} />
            ) : (
              <IconX aria-hidden className="size-3.5" stroke={2.2} />
            )}
          </Button>
        </div>
      ) : null}

      <PreviewTabContextMenu
        anchor={menuAnchor}
        canClose={closable}
        canDuplicate={canDuplicateTab(tab)}
        canUnpin={canUnpinTab(tab)}
        onClose={onClose}
        onDismiss={() => setMenuAnchor(null)}
        onDuplicate={onDuplicate}
        onPin={onPin}
        onUnpin={onUnpin}
        open={menuAnchor !== null}
        pinned={tab.pinned}
      />
    </div>
  );
}
