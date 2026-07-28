"use client";

import { PreviewTabLane } from "@/components/preview-tabs/preview-tab-lane";
import "./preview-tab-chrome.css";
import { PANEL_HEADER_ROW_CLASS, PANEL_HEADER_ROW_WITH_TABS_CLASS, PANEL_HEADER_SETTINGS_CLASS, PANEL_HEADER_TABLIST_CLASS } from "@/components/preview-tabs/panel-header";
import { TabStripSettingsMenu } from "@/components/preview-tabs/tab-strip-settings-menu";
import {
  computePinnedLaneCompression,
  useElementWidth,
} from "@/components/preview-tabs/use-tab-lane-compression";
import { getPinnedTabs, getUnpinnedTabs } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";
import { cn } from "@/lib/utils";

/** Room for settings control + at least one tab in the unpinned lane. */
const UNPINNED_RESERVE = 152;

export function PreviewTabStrip() {
  const state = usePreviewTabsStore();
  const { ref: stripRef, width: stripWidth } =
    useElementWidth<HTMLElement>();

  if (state.tabs.length === 0) {
    return <header className={PANEL_HEADER_ROW_CLASS} />;
  }

  const pinnedTabs = getPinnedTabs(state);
  const unpinnedTabs = getUnpinnedTabs(state);
  const { compression, scrollFallback } = computePinnedLaneCompression(
    stripWidth,
    pinnedTabs.length,
    UNPINNED_RESERVE,
  );

  return (
    <header className={cn(PANEL_HEADER_ROW_WITH_TABS_CLASS, "min-w-0")} ref={stripRef}>
      <div className="flex min-w-0 flex-1 items-stretch overflow-hidden">
        <div className={PANEL_HEADER_TABLIST_CLASS} role="tablist">
          <PreviewTabLane
            activeTabId={state.activeTabId}
            compression={compression}
            hasTrailingUnpinnedLane={unpinnedTabs.length > 0}
            onClose={state.closeTab}
            onDuplicate={state.duplicateTab}
            onPin={state.pinTab}
            onSelect={state.focusTab}
            onUnpin={state.unpinTab}
            scrollFallback={scrollFallback}
            tabs={pinnedTabs}
            variant="pinned"
          />
          {pinnedTabs.length > 0 ? (
            <div className="w-px shrink-0 self-stretch bg-border" />
          ) : null}
          <PreviewTabLane
            activeTabId={state.activeTabId}
            onClose={state.closeTab}
            onDuplicate={state.duplicateTab}
            onPin={state.pinTab}
            onSelect={state.focusTab}
            onUnpin={state.unpinTab}
            overflowMode={state.overflowMode}
            tabs={unpinnedTabs}
            variant="unpinned"
          />
        </div>
      </div>

      <div className={PANEL_HEADER_SETTINGS_CLASS}>
        <TabStripSettingsMenu
          onSetOverflowMode={state.setOverflowMode}
          overflowMode={state.overflowMode}
        />
      </div>
    </header>
  );
}
