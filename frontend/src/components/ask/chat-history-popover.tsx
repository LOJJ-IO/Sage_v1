"use client";

import { useMemo, useState, type RefObject } from "react";

import { Popover, PopoverContent } from "@/components/ui/popover";

export type ChatHistoryEntry = {
  id: string;
  title: string;
  /** First question, shown under the title and matched by search. */
  preview: string;
  updatedAt: number;
};

type ChatHistoryPopoverProps = {
  anchor: RefObject<HTMLElement | null>;
  chats: ChatHistoryEntry[];
  /** "search" focuses the search box (Search chats); "history" just lists. */
  mode: "search" | "history" | null;
  onClose: () => void;
  onSelect: (chatId: string) => void;
};

function formatWhen(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ChatHistoryPopover({
  anchor,
  chats,
  mode,
  onClose,
  onSelect,
}: ChatHistoryPopoverProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!needle) return sorted;
    return sorted.filter(
      (chat) =>
        chat.title.toLowerCase().includes(needle) ||
        chat.preview.toLowerCase().includes(needle),
    );
  }, [chats, query]);

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          setQuery("");
          onClose();
        }
      }}
      open={mode !== null}
    >
      <PopoverContent align="end" anchor={anchor} className="w-72 max-w-[calc(100vw-2rem)] p-2">
        <input
          aria-label="Search chats"
          autoFocus={mode === "search"}
          className="mb-2 h-8 w-full rounded-md border border-border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chats…"
          value={query}
        />
        {results.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            {chats.length === 0
              ? "No earlier chats yet. Start a new chat to keep this one here."
              : "No chats match that search."}
          </p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-0.5 overflow-auto">
            {results.map((chat) => (
              <li key={chat.id}>
                <button
                  className="flex w-full cursor-pointer flex-col rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    setQuery("");
                    onSelect(chat.id);
                  }}
                  type="button"
                >
                  <span className="flex w-full items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{chat.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatWhen(chat.updatedAt)}
                    </span>
                  </span>
                  <span className="w-full truncate text-xs text-muted-foreground">{chat.preview}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
