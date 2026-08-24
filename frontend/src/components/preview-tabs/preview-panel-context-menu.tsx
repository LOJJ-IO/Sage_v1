"use client";

import { IconMessageCircle, IconUpload } from "@tabler/icons-react";

import { ContextMenuItem, ContextMenuPortal, type ContextMenuAnchor } from "@/components/ui/context-menu";

type PreviewPanelContextMenuProps = {
  anchor: ContextMenuAnchor;
  onDismiss: () => void;
  /** Title of the file currently open in the active tab, or `null` when the
   * stage is empty — decides which menu (Upload vs. "Ask about this doc")
   * renders. */
  activeFileTitle: string | null;
  onUpload: () => void;
  onAskAboutDoc: () => void;
};

/** Right-click on the center preview panel — either empty stage (Upload) or
 * over an open file's content ("Ask about this doc"), same handler either way. */
export function PreviewPanelContextMenu({
  anchor,
  onDismiss,
  activeFileTitle,
  onUpload,
  onAskAboutDoc,
}: PreviewPanelContextMenuProps) {
  return (
    <ContextMenuPortal anchor={anchor} onDismiss={onDismiss}>
      {activeFileTitle === null ? (
        <ContextMenuItem
          icon={<IconUpload aria-hidden className="size-4" stroke={2.2} />}
          label="Upload"
          onSelect={() => {
            onDismiss();
            onUpload();
          }}
        />
      ) : (
        <ContextMenuItem
          icon={<IconMessageCircle aria-hidden className="size-4" stroke={2.2} />}
          label="Ask about this doc"
          onSelect={() => {
            onDismiss();
            onAskAboutDoc();
          }}
        />
      )}
    </ContextMenuPortal>
  );
}
