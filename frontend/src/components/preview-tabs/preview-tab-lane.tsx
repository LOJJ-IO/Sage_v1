"use client";

import { Fragment } from "react";

import { PreviewTab } from "@/components/preview-tabs/preview-tab";
import { TAB_MAX_WIDTH_PX } from "@/components/preview-tabs/use-tab-lane-compression";
import type {
  PreviewTab as PreviewTabType,
  TabId,
} from "@/lib/preview-tabs/types";

type PreviewTabLaneProps = {
  tabs: PreviewTabType[];
  activeTabId: TabId | null;
  onSelect: (tabId: TabId) => void;
  onPin: (tabId: TabId) => void;
  onUnpin: (tabId: TabId) => void;
  onDuplicate: (tabId: TabId) => void;
  onClose: (tabId: TabId) => void;
};

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
    <div className="scrollbar-thin flex h-full min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-hidden">
      {tabs.map((tab, index) => (
        <Fragment key={tab.tabId}>
          {index > 0 ? (
            <div aria-hidden className="preview-tab-divider shrink-0" />
          ) : null}
          <div
            className="preview-tab-lane-item flex h-full shrink grow basis-0 items-stretch"
            data-active={tab.tabId === activeTabId ? "" : undefined}
            style={{ maxWidth: TAB_MAX_WIDTH_PX }}
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
