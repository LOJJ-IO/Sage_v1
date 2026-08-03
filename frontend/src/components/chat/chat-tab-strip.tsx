"use client";

import { IconX } from "@tabler/icons-react";

import type { ChatSession } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

type ChatTabStripProps = {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
};

export function ChatTabStrip({
  sessions,
  activeSessionId,
  onSelect,
  onClose,
}: ChatTabStripProps) {
  if (sessions.length < 2) {
    return null;
  }

  return (
    <div
      aria-label="Chats"
      className="flex h-10 w-full shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-2"
      role="tablist"
    >
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;
        return (
          <div
            key={session.id}
            className={cn(
              "group flex h-7 shrink-0 items-center gap-1 rounded-full pl-3 pr-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <button
              aria-selected={isActive}
              className="max-w-32 truncate"
              onClick={() => onSelect(session.id)}
              role="tab"
              type="button"
            >
              {session.title}
            </button>
            <button
              aria-label={`Close ${session.title}`}
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onClose(session.id);
              }}
              type="button"
            >
              <IconX aria-hidden="true" className="size-3" stroke={2.2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
