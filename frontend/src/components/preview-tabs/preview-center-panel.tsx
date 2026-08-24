"use client";

import { useState } from "react";

import { PreviewPanelContextMenu } from "@/components/preview-tabs/preview-panel-context-menu";
import { PreviewStage } from "@/components/preview-tabs/preview-stage";
import { PreviewTabStrip } from "@/components/preview-tabs/preview-tab-strip";
import type { ContextMenuAnchor } from "@/components/ui/context-menu";
import type { LibraryFile } from "@/lib/file-upload";
import { getActiveTab } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";

/** Matches `PANEL_SURFACE` in `page.tsx` — kept local since that constant
 * isn't exported (it's private to the app shell). */
const PANEL_SURFACE =
  "flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-background";

type PreviewCenterPanelProps = {
  /** When true and no tabs are open, the stage points at the file tree/upload instead of just "nothing open". */
  filesEmpty?: boolean;
  /** Library entries — used to resolve in-memory File blobs for standalone preview. */
  files?: LibraryFile[];
  onUpload?: () => void;
  onAskAboutDoc?: (fileTitle: string) => void;
};

export function PreviewCenterPanel({ filesEmpty, files = [], onUpload, onAskAboutDoc }: PreviewCenterPanelProps) {
  const tabs = usePreviewTabsStore((state) => state.tabs);
  const activeTab = usePreviewTabsStore((state) => getActiveTab(state));
  const localFile =
    activeTab != null
      ? (files.find((entry) => entry.id === activeTab.resourceKey)?.file ?? null)
      : null;
  const [contextMenuAnchor, setContextMenuAnchor] = useState<ContextMenuAnchor | null>(null);

  return (
    <section className={PANEL_SURFACE}>
      <PreviewTabStrip />
      <div
        className="min-h-0 flex-1 overflow-hidden"
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenuAnchor({ x: event.clientX, y: event.clientY });
        }}
      >
        <PreviewStage
          activeTab={activeTab}
          filesEmpty={filesEmpty}
          hasTabs={tabs.length > 0}
          localFile={localFile}
        />
      </div>

      {contextMenuAnchor ? (
        <PreviewPanelContextMenu
          activeFileTitle={activeTab?.title ?? null}
          anchor={contextMenuAnchor}
          onAskAboutDoc={() => {
            if (activeTab) onAskAboutDoc?.(activeTab.title);
          }}
          onDismiss={() => setContextMenuAnchor(null)}
          onUpload={() => onUpload?.()}
        />
      ) : null}
    </section>
  );
}
