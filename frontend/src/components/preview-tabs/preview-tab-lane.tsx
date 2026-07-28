"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { PreviewTab } from "@/components/preview-tabs/preview-tab";
import type { TabCompression } from "@/components/preview-tabs/use-tab-lane-compression";
import type {
  OverflowMode,
  PreviewTab as PreviewTabType,
  TabId,
} from "@/lib/preview-tabs/types";

const ESTIMATED_TAB_WIDTH = 128;
const DEFAULT_VISIBLE_COUNT = 3;

type PreviewTabLaneProps = {
  variant: "pinned" | "unpinned";
  tabs: PreviewTabType[];
  activeTabId: TabId | null;
  /** Pinned lane only — computed by the strip from a single width measurement. */
  compression?: TabCompression;
  /** Pinned lane only — true once even icon-only tabs don't fit. */
  scrollFallback?: boolean;
  /** Unpinned lane only. */
  overflowMode?: OverflowMode;
  onSelect: (tabId: TabId) => void;
  onPin: (tabId: TabId) => void;
  onUnpin: (tabId: TabId) => void;
  onDuplicate: (tabId: TabId) => void;
  onClose: (tabId: TabId) => void;
};

export function PreviewTabLane({
  variant,
  tabs,
  activeTabId,
  compression = "normal",
  scrollFallback = false,
  overflowMode,
  onSelect,
  onPin,
  onUnpin,
  onDuplicate,
  onClose,
}: PreviewTabLaneProps) {
  const isPinned = variant === "pinned";
  const usesPagination = !isPinned && overflowMode === "pagination";
  const usesScroll = !isPinned && overflowMode !== "pagination";

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);
  const [pageStart, setPageStart] = useState(0);

  useEffect(() => {
    if (!usesPagination) {
      return;
    }

    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      const count = Math.max(1, Math.floor(node.clientWidth / ESTIMATED_TAB_WIDTH));
      setVisibleCount(count);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [usesPagination]);

  // Keep the active tab's page in view. Adjusted during render (not an
  // effect) per React's guidance for "adjusting state when a prop changes" —
  // tracking the previous trigger values lets us call setState conditionally
  // in the render body, which React coalesces into the same render pass
  // instead of committing a stale frame first.
  const [prevPaginationTrigger, setPrevPaginationTrigger] = useState<{
    activeTabId: TabId | null;
    visibleCount: number;
    tabs: PreviewTabType[];
  } | null>(null);

  if (
    usesPagination &&
    activeTabId !== null &&
    (prevPaginationTrigger === null ||
      prevPaginationTrigger.activeTabId !== activeTabId ||
      prevPaginationTrigger.visibleCount !== visibleCount ||
      prevPaginationTrigger.tabs !== tabs)
  ) {
    setPrevPaginationTrigger({ activeTabId, visibleCount, tabs });

    const activeIndex = tabs.findIndex((tab) => tab.tabId === activeTabId);
    if (activeIndex !== -1) {
      setPageStart((current) => {
        if (activeIndex < current) {
          return activeIndex;
        }
        if (activeIndex > current + visibleCount - 1) {
          return Math.max(0, activeIndex - visibleCount + 1);
        }
        return current;
      });
    }
  }

  useEffect(() => {
    if (isPinned ? !scrollFallback : !usesScroll) {
      return;
    }
    activeTabRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeTabId, isPinned, scrollFallback, usesScroll]);

  if (tabs.length === 0) {
    return null;
  }

  const visibleTabs = usesPagination
    ? tabs.slice(pageStart, pageStart + visibleCount)
    : tabs;
  const canPageBack = usesPagination && pageStart > 0;
  const canPageForward = usesPagination && pageStart + visibleCount < tabs.length;

  const laneClassName = isPinned
    ? `flex items-end gap-0.5 ${scrollFallback ? "overflow-x-auto" : "shrink-0 overflow-hidden"}`
    : `flex min-w-0 flex-1 items-end gap-0.5 ${usesScroll ? "overflow-x-auto" : "overflow-hidden"}`;

  return (
    <div className="flex min-w-0 items-end gap-0.5">
      {canPageBack ? (
        <button
          aria-label="Show previous tabs"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
          onClick={() =>
            setPageStart((current) => Math.max(0, current - visibleCount))
          }
          type="button"
        >
          <IconChevronLeft aria-hidden className="size-3.5" stroke={2.2} />
        </button>
      ) : null}

      <div className={laneClassName} ref={scrollRef}>
        {visibleTabs.map((tab) => (
          <div
            key={tab.tabId}
            className="min-w-0 shrink"
            ref={tab.tabId === activeTabId ? activeTabRef : undefined}
          >
            <PreviewTab
              compression={isPinned ? compression : "normal"}
              isActive={tab.tabId === activeTabId}
              onClose={() => onClose(tab.tabId)}
              onDuplicate={() => onDuplicate(tab.tabId)}
              onPin={() => onPin(tab.tabId)}
              onSelect={() => onSelect(tab.tabId)}
              onUnpin={() => onUnpin(tab.tabId)}
              tab={tab}
            />
          </div>
        ))}
      </div>

      {canPageForward ? (
        <button
          aria-label="Show next tabs"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
          onClick={() =>
            setPageStart((current) =>
              Math.min(tabs.length - visibleCount, current + visibleCount),
            )
          }
          type="button"
        >
          <IconChevronRight aria-hidden className="size-3.5" stroke={2.2} />
        </button>
      ) : null}
    </div>
  );
}
