"use client";

import { PreviewStage } from "@/components/preview-tabs/preview-stage";
import { PreviewTabStrip } from "@/components/preview-tabs/preview-tab-strip";
import { getActiveTab } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";

/** Matches `PANEL_SURFACE` in `page.tsx` — kept local since that constant
 * isn't exported (it's private to the app shell). */
const PANEL_SURFACE =
  "flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-background";

type PreviewCenterPanelProps = {
  /** When true and no tabs are open, the stage points at the file tree/upload instead of just "nothing open". */
  filesEmpty?: boolean;
};

export function PreviewCenterPanel({ filesEmpty }: PreviewCenterPanelProps) {
  const tabs = usePreviewTabsStore((state) => state.tabs);
  const activeTab = usePreviewTabsStore((state) => getActiveTab(state));

  return (
    <section className={PANEL_SURFACE}>
      <PreviewTabStrip />
      <div className="min-h-0 flex-1 overflow-hidden">
        <PreviewStage
          activeTab={activeTab}
          filesEmpty={filesEmpty}
          hasTabs={tabs.length > 0}
        />
      </div>
    </section>
  );
}
