"use client";

import type { ReactNode } from "react";

import { ChatTabLane } from "@/components/chat/chat-tab-lane";
import {
  PANEL_HEADER_ROW_WITH_TABS_CLASS,
  PANEL_HEADER_SETTINGS_CLASS,
  PANEL_HEADER_TABLIST_CLASS,
} from "@/components/ui/panel-header";
import type { ChatSession } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

type ChatTabStripProps = {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, title: string) => void;
  /** The header's action icon group (New chat, Search, History, Configure) —
   * owned by the page since it needs page-level state, just rendered in the
   * strip's trailing slot (same split as `PreviewTabStrip`/`TabStripSettingsMenu`). */
  trailing: ReactNode;
};

/** Always exactly one `h-14` row — mirrors `PreviewTabStrip` (same shared
 * classes/CSS) so the chat and preview tab strips sit at the same vertical
 * position no matter how many sessions/tabs are open, instead of the old
 * model where a second `h-10` row got conditionally stacked above the
 * header only once 2+ sessions existed. */
export function ChatTabStrip({ sessions, activeSessionId, onSelect, onClose, onRename, trailing }: ChatTabStripProps) {
  return (
    <header className={cn(PANEL_HEADER_ROW_WITH_TABS_CLASS, "min-w-0")}>
      <div className={PANEL_HEADER_TABLIST_CLASS}>
        <ChatTabLane
          activeSessionId={activeSessionId}
          onClose={onClose}
          onRename={onRename}
          onSelect={onSelect}
          sessions={sessions}
        />
      </div>
      <div className={PANEL_HEADER_SETTINGS_CLASS}>{trailing}</div>
    </header>
  );
}
