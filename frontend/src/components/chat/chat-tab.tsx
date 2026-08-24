"use client";

import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import "@/components/preview-tabs/preview-tab-chrome.css";
import { TruncatedFilenameText } from "@/components/preview-tabs/truncated-filename";
import { Button } from "@/components/ui/button";
import { TAB_MAX_WIDTH_PX } from "@/components/ui/tab-chrome";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChatSession } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

type ChatTabProps = {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (title: string) => void;
};

/** Same visual chrome as `PreviewTab` (shared `preview-tab-chrome.css`
 * classes) — chat sessions are tabs now, not pills. No pin concept for
 * chats; rename moved from an always-visible title input to double-click
 * the tab, so it works the same whether there's 1 session or 10. */
export function ChatTab({ session, isActive, onSelect, onClose, onRename }: ChatTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(session.title);

  useEffect(() => {
    setDraftTitle(session.title);
  }, [session.title]);

  const commitRename = () => {
    setIsEditing(false);
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    }
  };

  return (
    <div
      className={cn(
        "preview-tab-chrome group relative w-full min-w-8 shrink-0 text-sm",
        isActive ? "preview-tab-shaped" : "preview-tab-inactive h-9 bg-transparent text-muted-foreground",
      )}
      style={{ width: TAB_MAX_WIDTH_PX }}
    >
      {isEditing ? (
        <input
          autoFocus
          aria-label="Chat title"
          className="absolute inset-y-0 left-2 right-7 my-auto h-6 min-w-0 rounded border border-border bg-background px-1 text-sm outline-none"
          onBlur={commitRename}
          onChange={(event) => setDraftTitle(event.target.value)}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              setDraftTitle(session.title);
              setIsEditing(false);
            }
          }}
          value={draftTitle}
        />
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                aria-selected={isActive}
                className="absolute inset-y-0 left-0 right-7 z-0 flex min-w-0 cursor-pointer items-center px-2 text-left"
                onClick={onSelect}
                onDoubleClick={() => setIsEditing(true)}
                role="tab"
                type="button"
              />
            }
          >
            <TruncatedFilenameText className="min-w-0 flex-1" title={session.title} />
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6} variant="compact">
            {session.title}
          </TooltipContent>
        </Tooltip>
      )}

      <div
        className={cn(
          "absolute inset-y-0 right-0 z-10 flex w-7 items-center justify-center",
          !isActive && "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
        )}
      >
        <Button aria-label={`Close ${session.title}`} onClick={onClose} size="icon-xs" type="button" variant="ghost">
          <IconX aria-hidden className="size-3.5" stroke={2.2} />
        </Button>
      </div>
    </div>
  );
}
