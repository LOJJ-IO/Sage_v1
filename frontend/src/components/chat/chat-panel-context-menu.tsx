"use client";

import { IconPlus, IconSearch } from "@tabler/icons-react";

import { ContextMenuItem, ContextMenuPortal, type ContextMenuAnchor } from "@/components/ui/context-menu";

type ChatPanelContextMenuProps = {
  anchor: ContextMenuAnchor;
  onDismiss: () => void;
  onNewChat: () => void;
  onSearchChats: () => void;
};

/** Right-click on empty space in the chat panel — mirrors the chat header's
 * own "+"/search icon actions. */
export function ChatPanelContextMenu({ anchor, onDismiss, onNewChat, onSearchChats }: ChatPanelContextMenuProps) {
  return (
    <ContextMenuPortal anchor={anchor} onDismiss={onDismiss}>
      <ContextMenuItem
        icon={<IconPlus aria-hidden className="size-4" stroke={2.2} />}
        label="New chat"
        onSelect={() => {
          onDismiss();
          onNewChat();
        }}
      />
      <ContextMenuItem
        icon={<IconSearch aria-hidden className="size-4" stroke={2.2} />}
        label="Search chats"
        onSelect={() => {
          onDismiss();
          onSearchChats();
        }}
      />
    </ContextMenuPortal>
  );
}
