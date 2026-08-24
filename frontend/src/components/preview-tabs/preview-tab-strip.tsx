"use client";

import { PreviewTabLane } from "@/components/preview-tabs/preview-tab-lane";
import "./preview-tab-chrome.css";
import {
  PANEL_HEADER_ROW_CLASS,
  PANEL_HEADER_ROW_WITH_TABS_CLASS,
  PANEL_HEADER_SETTINGS_CLASS,
  PANEL_HEADER_TABLIST_CLASS,
} from "@/components/ui/panel-header";
import { TabStripSettingsMenu } from "@/components/preview-tabs/tab-strip-settings-menu";
import { getOrderedTabs, getUnpinnedTabs } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";
import { cn } from "@/lib/utils";

export function PreviewTabStrip() {
  const state = usePreviewTabsStore();

  if (state.tabs.length === 0) {
    return <header className={PANEL_HEADER_ROW_CLASS} />;
  }

  const tabs = getOrderedTabs(state);
  const hasUnpinnedTabs = getUnpinnedTabs(state).length > 0;

  return (
    <header className={cn(PANEL_HEADER_ROW_WITH_TABS_CLASS, "min-w-0")}>
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-hidden">
        <div className={PANEL_HEADER_TABLIST_CLASS} role="tablist">
          <PreviewTabLane
            activeTabId={state.activeTabId}
            onClose={state.closeTab}
            onDuplicate={state.duplicateTab}
            onPin={state.pinTab}
            onSelect={state.focusTab}
            onUnpin={state.unpinTab}
            tabs={tabs}
          />
        </div>
      </div>

      <div className={PANEL_HEADER_SETTINGS_CLASS}>
        <TabStripSettingsMenu
          hasUnpinnedTabs={hasUnpinnedTabs}
          onCloseAllUnpinned={state.closeAllUnpinned}
        />
      </div>
    </header>
  );
}
