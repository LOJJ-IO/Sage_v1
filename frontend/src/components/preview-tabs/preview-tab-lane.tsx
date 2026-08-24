"use client";

import { Fragment } from "react";

import { PreviewTab } from "@/components/preview-tabs/preview-tab";
import type { PreviewTab as PreviewTabType, TabId } from "@/lib/preview-tabs/types";

type PreviewTabLaneProps = {
  tabs: PreviewTabType[];
  activeTabId: TabId | null;
  onSelect: (tabId: TabId) => void;
  onPin: (tabId: TabId) => void;
  onUnpin: (tabId: TabId) => void;
  onDuplicate: (tabId: TabId) => void;
  onClose: (tabId: TabId) => void;
};

/** `shrink-0` tabs in a scrolling lane — a tab never compresses below its
 * comfortable width; once tabs overflow, the lane scrolls (the parent's
 * `overflow-x-auto` in `panel-header.ts` does that), matching how chat
 * session tabs already behaved before this component adopted the same model. */
export function PreviewTabLane({
  tabs,
  activeTabId,
  onSelect,
  onPin,
  onUnpin,
  onDuplicate,
  onClose,
}: PreviewTabLaneProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full min-w-0 items-stretch">
      {tabs.map((tab, index) => (
        <Fragment key={tab.tabId}>
          {index > 0 ? (
            <div aria-hidden className="preview-tab-divider shrink-0" />
          ) : null}
          <div
            className="preview-tab-lane-item flex h-full shrink-0 items-stretch"
            data-active={tab.tabId === activeTabId ? "" : undefined}
          >
            <PreviewTab
              isActive={tab.tabId === activeTabId}
              onClose={() => onClose(tab.tabId)}
              onDuplicate={() => onDuplicate(tab.tabId)}
              onPin={() => onPin(tab.tabId)}
              onSelect={() => onSelect(tab.tabId)}
              onUnpin={() => onUnpin(tab.tabId)}
              tab={tab}
            />
          </div>
        </Fragment>
      ))}
    </div>
  );
}
