"use client";

import { PreviewTabLane } from "@/components/preview-tabs/preview-tab-lane";
import { TabStripSettingsMenu } from "@/components/preview-tabs/tab-strip-settings-menu";
import {
  computePinnedLaneCompression,
  useElementWidth,
} from "@/components/preview-tabs/use-tab-lane-compression";
import { getPinnedTabs, getUnpinnedTabs } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";

/** Reserve room for at least one unpinned tab + the strip settings button
 * before the pinned lane is allowed to claim more space. */
const UNPINNED_RESERVE = 136;

export function PreviewTabStrip() {
  const state = usePreviewTabsStore();
  const { ref: stripRef, width: stripWidth } = useElementWidth<HTMLDivElement>();

  if (state.tabs.length === 0) {
    return null;
  }

  const pinnedTabs = getPinnedTabs(state);
  const unpinnedTabs = getUnpinnedTabs(state);
  const { compression, scrollFallback } = computePinnedLaneCompression(
    stripWidth,
    pinnedTabs.length,
    UNPINNED_RESERVE,
  );

  return (
    <div
      className="flex h-14 min-w-0 shrink-0 items-end gap-1 border-b border-border bg-muted px-1"
      ref={stripRef}
      role="tablist"
    >
      <PreviewTabLane
        activeTabId={state.activeTabId}
        compression={compression}
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
        <div className="mb-1 w-px shrink-0 self-stretch bg-border" />
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
      <TabStripSettingsMenu
        onSetOverflowMode={state.setOverflowMode}
        overflowMode={state.overflowMode}
      />
    </div>
  );
}
