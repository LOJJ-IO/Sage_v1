"use client";

import { Fragment } from "react";

import { ChatTab } from "@/components/chat/chat-tab";
import type { ChatSession } from "@/lib/chat/types";

type ChatTabLaneProps = {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, title: string) => void;
};

/** Mirrors `PreviewTabLane` exactly — `shrink-0` tabs, scroll once they overflow. */
export function ChatTabLane({ sessions, activeSessionId, onSelect, onClose, onRename }: ChatTabLaneProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full min-w-0 items-stretch">
      {sessions.map((session, index) => (
        <Fragment key={session.id}>
          {index > 0 ? <div aria-hidden className="preview-tab-divider shrink-0" /> : null}
          <div
            className="preview-tab-lane-item flex h-full shrink-0 items-stretch"
            data-active={session.id === activeSessionId ? "" : undefined}
          >
            <ChatTab
              isActive={session.id === activeSessionId}
              onClose={() => onClose(session.id)}
              onRename={(title) => onRename(session.id, title)}
              onSelect={() => onSelect(session.id)}
              session={session}
            />
          </div>
        </Fragment>
      ))}
    </div>
  );
}
