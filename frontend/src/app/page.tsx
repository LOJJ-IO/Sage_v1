"use client";

import {
  IconArrowsSort,
  IconArrowUp,
  IconBookmark,
  IconEyeQuestion,
  IconFile,
  IconMessageCircle,
  IconMicrophone,
  IconUpload,
  IconWand,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FileLibraryPanel } from "@/components/files/file-library-panel";
import { OrganizationDialog } from "@/components/accounts/organization-dialog";
import { ProfileMenu } from "@/components/auth/profile-menu";
import { RequireAuth } from "@/components/auth/require-auth";
import { ChatTabStrip } from "@/components/chat/chat-tab-strip";
import {
  CitationSources,
  type CitationSource,
} from "@/components/ask/citation-sources";
import { MarkdownMessage } from "@/components/ask/markdown-message";
import { TypingIndicator } from "@/components/ask/typing-indicator";
import { PreviewCenterPanel } from "@/components/preview-tabs";
import { ConfigureChatDialog } from "@/components/settings/configure-chat-dialog";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { useFileLibrary } from "@/hooks/use-file-library";
import { usePersonalFolders } from "@/hooks/use-personal-folders";
import { useSyncRemovedPreviewTabs } from "@/hooks/use-sync-removed-preview-tabs";
import { getUserRole } from "@/lib/auth/session";
import type { ChatMessage, ChatSession } from "@/lib/chat/types";
import type { LibraryFile } from "@/lib/file-upload";
import { fileTypeFromFilename } from "@/lib/file-upload";
import { getAncestorFolderIdsForFile } from "@/lib/personal-folders";
import { getActiveTab } from "@/lib/preview-tabs/selectors";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MIN_SIDE_WIDTH = 16;
const MIN_MIDDLE_WIDTH = 16;
const DEFAULT_SIDE_WIDTH = 30;
/** Visual gutter between floating panels (also the resize track). */
const PANEL_GUTTER = "0.5rem";
const PANEL_SURFACE =
  "flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-background";
const ICON_SIZE = 20;
const ICON_SIZE_SM = 14;
const ICON_SIZE_EMPTY = 16;
const ICON_STROKE = 2.2;

function Codicon({
  iconClass,
  size = ICON_SIZE,
}: {
  iconClass: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`codicon ${iconClass} [-webkit-text-stroke:0.35px_currentColor]`}
      style={{ fontSize: size }}
    />
  );
}

function TablerIcon({
  icon: Icon,
  size = ICON_SIZE,
}: {
  icon: typeof IconFile;
  size?: number;
}) {
  return (
    <Icon
      aria-hidden="true"
      className="text-current"
      size={size}
      stroke={ICON_STROKE}
    />
  );
}

function FilesEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <EmptyState
      action={
        <Button onClick={onUpload} size="sm" type="button">
          <TablerIcon icon={IconUpload} size={ICON_SIZE_SM} />
          Upload files
        </Button>
      }
      className="h-full px-4"
      description="Upload documents to populate your file tree and keep everything in one place."
      icon={<Codicon iconClass="codicon-folder-library" size={ICON_SIZE_EMPTY} />}
      title="No files yet"
    />
  );
}

function AskAiEmptyState({
  hasFiles,
  onUpload,
}: {
  hasFiles: boolean;
  onUpload: () => void;
}) {
  if (!hasFiles) {
    return (
      <EmptyState
        action={
          <Button onClick={onUpload} size="sm" type="button">
            <TablerIcon icon={IconUpload} size={ICON_SIZE_SM} />
            Upload files
          </Button>
        }
        className="h-full px-4"
        description="Upload documents first so I can answer questions about them."
        icon={
          <TablerIcon icon={IconMessageCircle} size={ICON_SIZE_EMPTY} />
        }
        title="No documents yet"
      />
    );
  }

  return (
    <EmptyState
      className="h-full px-4"
      description="Ask about policies, procedures, and more. I'll look across your uploaded docs."
      icon={<TablerIcon icon={IconMessageCircle} size={ICON_SIZE_EMPTY} />}
      title="Ask AI"
    />
  );
}

function AskAiMessageList({
  messages,
  isSending,
  onOpenSource,
}: {
  messages: ChatMessage[];
  isSending: boolean;
  onOpenSource: (source: CitationSource) => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-2">
      {messages.map((message) => (
        <div
          className={
            message.role === "user"
              ? "ml-8 rounded-2xl bg-secondary px-3 py-2 text-sm text-secondary-foreground"
              : "mr-8 rounded-2xl bg-muted px-3 py-2 text-sm text-foreground"
          }
          key={message.id}
        >
          {message.role === "assistant" ? (
            <MarkdownMessage content={message.content} />
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
          {message.role === "assistant" && message.citations && message.citations.length > 0 ? (
            <CitationSources
              citations={message.citations}
              onOpenSource={onOpenSource}
            />
          ) : null}
        </div>
      ))}
      <AnimatePresence>{isSending ? <TypingIndicator /> : null}</AnimatePresence>
    </div>
  );
}

function AskAiChatInput({
  hasFiles,
  onSend,
}: {
  hasFiles: boolean;
  onSend: (message: string) => void;
}) {
  const [message, setMessage] = useState("");
  const canSend = hasFiles && message.trim().length > 0;

  const send = () => {
    if (!canSend) {
      return;
    }
    onSend(message.trim());
    setMessage("");
  };

  return (
    <div className="min-w-0 shrink-0 p-3">
      <Input
        disabled={!hasFiles}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        placeholder={
          hasFiles
            ? "Ask about policies, procedures, or documentation..."
            : "Upload documents to start asking..."
        }
        trailing={
          <>
            <button
              aria-label="Voice input"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              disabled={!hasFiles}
              type="button"
            >
              <TablerIcon icon={IconMicrophone} />
            </button>
            <button
              aria-label="Send message"
              className={
                canSend
                  ? "flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
                  : "flex size-8 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground"
              }
              disabled={!canSend}
              onClick={send}
              type="button"
            >
              <TablerIcon icon={IconArrowUp} />
            </button>
          </>
        }
        type="text"
        value={message}
      />
    </div>
  );
}

function ChatHistoryMenu({
  sessions,
  activeSessionId,
  onSelect,
}: {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <p className="px-2 py-1.5 text-sm text-muted-foreground">No chats yet.</p>
    );
  }

  return (
    <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
      {sessions.map((session) => (
        <li key={session.id}>
          <button
            className={
              session.id === activeSessionId
                ? "w-full truncate rounded-md bg-muted px-2 py-1.5 text-left text-sm font-medium text-foreground"
                : "w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
            }
            onClick={() => onSelect(session.id)}
            type="button"
          >
            {session.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

function HeaderIconGroup({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex w-fit items-center gap-0.5 rounded-full border border-border bg-background p-0.5 shadow-sm">
      {children}
    </div>
  );
}

function HeaderIconButton({
  label,
  iconClass,
  icon,
  onClick,
  active = false,
  tooltipPlacement = "bottom",
}: {
  label: string;
  iconClass?: string;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  tooltipPlacement?: "bottom" | "left" | "right";
}) {
  const sideOffset = tooltipPlacement === "bottom" ? 6 : 8;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={label}
            aria-pressed={active}
            className={
              active
                ? "flex size-8 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                : "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            }
            onClick={onClick}
            type="button"
          />
        }
      >
        {icon ?? <Codicon iconClass={iconClass!} size={ICON_SIZE} />}
      </TooltipTrigger>
      <TooltipContent
        side={tooltipPlacement}
        sideOffset={sideOffset}
        variant="compact"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Home() {
  return (
    <RequireAuth>
      <HomeWorkspace />
    </RequireAuth>
  );
}

function HomeWorkspace() {
  const {
    files,
    openFilePicker,
    removeFile,
    updateTags,
    toggleBookmark,
    openReplacePicker,
    inputRef,
    replaceInputRef,
    inputProps,
    replaceInputProps,
  } = useFileLibrary();

  const personalFolders = usePersonalFolders();

  useSyncRemovedPreviewTabs(files);

  const openTab = usePreviewTabsStore((state) => state.openTab);
  const handleOpenFile = useCallback(
    (file: LibraryFile) => {
      openTab({
        resourceKey: file.id,
        title: file.file.name,
        fileType: file.fileType,
      });
    },
    [openTab],
  );

  const handleOpenCitationSource = useCallback(
    (source: CitationSource) => {
      openTab({
        resourceKey: source.fileId,
        title: source.filename,
        fileType: fileTypeFromFilename(source.filename),
        viewState: {
          highlight: {
            citationId: source.citationId,
            charStart: source.charStart,
            charEnd: source.charEnd,
          },
        },
      });
    },
    [openTab],
  );

  const [leftWidth, setLeftWidth] = useState(DEFAULT_SIDE_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_SIDE_WIDTH);
  const [isLeftVisible, setIsLeftVisible] = useState(true);
  const [isRightVisible, setIsRightVisible] = useState(true);
  const [sortOrder, setSortOrder] = useState<"name-asc" | "name-desc">("name-asc");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [autoRevealEnabled, setAutoRevealEnabled] = useState(false);
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const activeResourceKey = usePreviewTabsStore(
    (state) => getActiveTab(state)?.resourceKey ?? null,
  );

  const visibleFiles = useMemo(() => {
    const query = fileSearchQuery.trim().toLowerCase();
    const filtered = files.filter((entry) => {
      if (bookmarkedOnly && !entry.isBookmarked) return false;
      if (query && !entry.file.name.toLowerCase().includes(query)) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) =>
      a.file.name.localeCompare(b.file.name),
    );
    return sortOrder === "name-desc" ? sorted.reverse() : sorted;
  }, [files, bookmarkedOnly, fileSearchQuery, sortOrder]);

  // Personal folders aren't search/bookmark-aware in v1 — an active filter
  // falls back to the flat, filtered list instead of the tree.
  const showFolderTree = fileSearchQuery.trim() === "" && !bookmarkedOnly;

  const { items: personalFolderItems, folders: personalFolderList, expandFolders } = personalFolders;
  useEffect(() => {
    if (!autoRevealEnabled || !activeResourceKey) return;
    const ancestorIds = getAncestorFolderIdsForFile(personalFolderItems, personalFolderList, activeResourceKey);
    expandFolders(ancestorIds);
  }, [autoRevealEnabled, activeResourceKey, personalFolderItems, personalFolderList, expandFolders]);

  const {
    sessions: chatSessions,
    activeSession,
    isActiveSessionPending,
    newChat,
    closeChat,
    switchChat,
    renameChat,
    sendMessage,
  } = useChatSessions();
  const visibleMessages = useMemo(() => {
    const query = chatSearchQuery.trim().toLowerCase();
    if (!query) return activeSession.messages;
    return activeSession.messages.filter((message) =>
      message.content.toLowerCase().includes(query),
    );
  }, [activeSession.messages, chatSearchQuery]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const [configureChatOpen, setConfigureChatOpen] = useState(false);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const openOrganization = useCallback(() => {
    setOrganizationOpen(true);
  }, []);

  const openConfigureChat = useCallback(() => {
    setConfigureChatOpen(true);
  }, []);

  useEffect(() => {
    const role = getUserRole();
    setIsAdmin(role === "admin" || role === null);
  }, []);

  const startResize = useCallback(
    (side: "left" | "right") => {
      const handlePointerMove = (event: PointerEvent) => {
        const viewportWidth = window.innerWidth;
        const pointerPercent = (event.clientX / viewportWidth) * 100;

        if (side === "left") {
          const visibleRightWidth = isRightVisible ? rightWidth : 0;
          const maxLeftWidth = 100 - visibleRightWidth - MIN_MIDDLE_WIDTH;
          setLeftWidth(
            Math.min(Math.max(pointerPercent, MIN_SIDE_WIDTH), maxLeftWidth),
          );
          return;
        }

        const rightPercent = 100 - pointerPercent;
        const visibleLeftWidth = isLeftVisible ? leftWidth : 0;
        const maxRightWidth = 100 - visibleLeftWidth - MIN_MIDDLE_WIDTH;
        setRightWidth(
          Math.min(Math.max(rightPercent, MIN_SIDE_WIDTH), maxRightWidth),
        );
      };

      const stopResize = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", stopResize);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", stopResize);
    },
    [isLeftVisible, isRightVisible, leftWidth, rightWidth],
  );

  const leftColumnWidth = isLeftVisible ? `${leftWidth}%` : "0px";
  const rightColumnWidth = isRightVisible ? `${rightWidth}%` : "0px";
  const gridTemplateColumns = [
    leftColumnWidth,
    isLeftVisible ? PANEL_GUTTER : "0px",
    "minmax(0, 1fr)",
    isRightVisible ? PANEL_GUTTER : "0px",
    rightColumnWidth,
  ].join(" ");

  return (
    <main className="flex h-full flex-col overflow-hidden bg-muted text-foreground">
      <input ref={inputRef} {...inputProps} />
      <input ref={replaceInputRef} {...replaceInputProps} />
      <div className="relative flex h-12 shrink-0 items-center px-2">
        <div className="flex items-center gap-2">
          <HeaderIconGroup>
            <HeaderIconButton
              iconClass={
                isLeftVisible
                  ? "codicon-layout-sidebar-left-off"
                  : "codicon-layout-sidebar-left"
              }
              label="Collapse"
              onClick={() => setIsLeftVisible((visible) => !visible)}
              tooltipPlacement="right"
            />
          </HeaderIconGroup>
          <HeaderIconGroup>
            <HeaderIconButton iconClass="codicon-folder-library" label="Files" />
            <HeaderIconButton
              active={isFileSearchOpen}
              iconClass="codicon-search"
              label="Search"
              onClick={() =>
                setIsFileSearchOpen((open) => {
                  const next = !open;
                  if (!next) setFileSearchQuery("");
                  return next;
                })
              }
            />
            <HeaderIconButton
              icon={<TablerIcon icon={IconUpload} />}
              label="Upload"
              onClick={openFilePicker}
            />
            <HeaderIconButton
              active={bookmarkedOnly}
              icon={<TablerIcon icon={IconBookmark} />}
              label="Bookmarks"
              onClick={() => setBookmarkedOnly((value) => !value)}
            />
          </HeaderIconGroup>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <HeaderIconGroup>
            {isAdmin ? (
              <>
                <HeaderIconButton
                  iconClass="codicon-organization"
                  label="Organization"
                  onClick={openOrganization}
                />
                <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />
              </>
            ) : null}
            <ProfileMenu onOpenSettings={openSettings} />
          </HeaderIconGroup>
          <HeaderIconGroup>
            <HeaderIconButton
              iconClass={
                isRightVisible
                  ? "codicon-layout-sidebar-right-off"
                  : "codicon-layout-sidebar-right"
              }
              label="Collapse"
              onClick={() => setIsRightVisible((visible) => !visible)}
              tooltipPlacement="left"
            />
          </HeaderIconGroup>
        </div>
      </div>

      <div
        className="grid min-h-0 min-w-0 flex-1 overflow-hidden px-2 pb-0"
        style={{ gridTemplateColumns }}
      >
        <section className={PANEL_SURFACE}>
          <header className="flex h-14 w-full shrink-0 items-center justify-center border-b border-border">
            <HeaderIconGroup>
              <HeaderIconButton
                active={sortOrder === "name-desc"}
                icon={<TablerIcon icon={IconArrowsSort} />}
                label={
                  sortOrder === "name-asc"
                    ? "Sort: Name (A–Z)"
                    : "Sort: Name (Z–A)"
                }
                onClick={() =>
                  setSortOrder((order) =>
                    order === "name-asc" ? "name-desc" : "name-asc",
                  )
                }
              />
              <HeaderIconButton
                iconClass="codicon-new-folder"
                label="New folder"
                onClick={() => void personalFolders.createFolder()}
              />
              <HeaderIconButton
                icon={<TablerIcon icon={IconWand} />}
                label="Auto-Sort"
              />
              <HeaderIconButton
                active={autoRevealEnabled}
                icon={<TablerIcon icon={IconEyeQuestion} />}
                label="Auto-reveal current file"
                onClick={() => setAutoRevealEnabled((value) => !value)}
              />
              <HeaderIconButton
                iconClass="codicon-collapse-all"
                label="Collapse all"
                onClick={personalFolders.collapseAll}
              />
            </HeaderIconGroup>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {isFileSearchOpen ? (
              <Input
                aria-label="Search files"
                autoFocus
                className="mb-2"
                onChange={(event) => setFileSearchQuery(event.target.value)}
                placeholder="Search files by name…"
                type="text"
                value={fileSearchQuery}
              />
            ) : null}
            {files.length > 0 ? (
              showFolderTree || visibleFiles.length > 0 ? (
                <FileLibraryPanel
                  files={showFolderTree ? files : visibleFiles}
                  onDeleteFile={removeFile}
                  onEditTags={updateTags}
                  onOpenFile={handleOpenFile}
                  onReplaceFile={openReplacePicker}
                  onToggleBookmark={toggleBookmark}
                  personalFolders={personalFolders}
                  revealFileId={autoRevealEnabled ? activeResourceKey : null}
                  showTree={showFolderTree}
                />
              ) : (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  No files match{bookmarkedOnly ? " your bookmarks filter" : ""}
                  {fileSearchQuery ? ` "${fileSearchQuery}"` : ""}.
                </p>
              )
            ) : (
              <FilesEmptyState onUpload={openFilePicker} />
            )}
          </div>
        </section>
        <div className="relative h-full">
          {isLeftVisible ? (
            <button
              aria-label="Resize left column"
              className="absolute left-1/2 top-0 z-10 h-full w-4 -translate-x-1/2 cursor-col-resize touch-none bg-transparent"
              onPointerDown={() => {
                setIsLeftVisible(true);
                startResize("left");
              }}
              type="button"
            />
          ) : null}
        </div>
        <PreviewCenterPanel files={files} filesEmpty={files.length === 0} />
        <div className="relative h-full">
          {isRightVisible ? (
            <button
              aria-label="Resize right column"
              className="absolute left-1/2 top-0 z-10 h-full w-4 -translate-x-1/2 cursor-col-resize touch-none bg-transparent"
              onPointerDown={() => {
                setIsRightVisible(true);
                startResize("right");
              }}
              type="button"
            />
          ) : null}
        </div>
        <div className="relative min-h-0 min-w-0">
          <section className={PANEL_SURFACE}>
          <ChatTabStrip
            activeSessionId={activeSession.id}
            onClose={closeChat}
            onSelect={switchChat}
            sessions={chatSessions}
          />
          <header className="flex min-w-0 h-14 w-full shrink-0 items-center gap-2 border-b border-border px-2">
            <input
              aria-label="Chat title"
              className="h-8 w-64 min-w-0 max-w-[calc(100%-7.5rem)] shrink truncate rounded-md border border-border bg-transparent px-2 text-sm font-semibold text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              onChange={(event) => renameChat(activeSession.id, event.target.value)}
              value={activeSession.title}
            />
            <div className="ml-auto shrink-0">
              <HeaderIconGroup>
                <HeaderIconButton
                  iconClass="codicon-add"
                  label="New chat"
                  onClick={newChat}
                />
                <HeaderIconButton
                  active={isChatSearchOpen}
                  iconClass="codicon-search"
                  label="Search chats"
                  onClick={() =>
                    setIsChatSearchOpen((open) => {
                      const next = !open;
                      if (!next) setChatSearchQuery("");
                      return next;
                    })
                  }
                />
                <Popover onOpenChange={setIsHistoryOpen} open={isHistoryOpen}>
                  <PopoverTrigger
                    aria-label="History"
                    aria-pressed={isHistoryOpen}
                    className={
                      isHistoryOpen
                        ? "flex size-8 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        : "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    }
                  >
                    <Codicon iconClass="codicon-history" size={ICON_SIZE} />
                  </PopoverTrigger>
                  <PopoverContent align="end">
                    <ChatHistoryMenu
                      activeSessionId={activeSession.id}
                      onSelect={(id: string) => {
                        switchChat(id);
                        setIsHistoryOpen(false);
                      }}
                      sessions={chatSessions}
                    />
                  </PopoverContent>
                </Popover>
                <HeaderIconButton
                  iconClass="codicon-settings"
                  label="Configure"
                  onClick={openConfigureChat}
                />
              </HeaderIconGroup>
            </div>
          </header>
          {isChatSearchOpen ? (
            <div className="shrink-0 border-b border-border p-2">
              <Input
                aria-label="Search chats"
                autoFocus
                onChange={(event) => setChatSearchQuery(event.target.value)}
                placeholder="Search this chat…"
                type="text"
                value={chatSearchQuery}
              />
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {activeSession.messages.length > 0 ? (
              visibleMessages.length > 0 || isActiveSessionPending ? (
                <AskAiMessageList
                  isSending={isActiveSessionPending}
                  messages={visibleMessages}
                  onOpenSource={handleOpenCitationSource}
                />
              ) : (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  No messages match &ldquo;{chatSearchQuery}&rdquo;.
                </p>
              )
            ) : (
              <AskAiEmptyState
                hasFiles={files.length > 0}
                onUpload={openFilePicker}
              />
            )}
          </div>
          <AskAiChatInput
            hasFiles={files.length > 0}
            onSend={sendMessage}
          />
        </section>
        </div>
      </div>

      <footer className="shrink-0 px-2 py-1.5 text-center text-xs text-muted-foreground">
        Sage can be inaccurate; please double-check its responses.
      </footer>

      <SettingsDialog onOpenChange={setSettingsOpen} open={settingsOpen} />
      <OrganizationDialog
        onOpenChange={setOrganizationOpen}
        open={organizationOpen}
      />
      <ConfigureChatDialog
        onOpenChange={setConfigureChatOpen}
        open={configureChatOpen}
      />
    </main>
  );
}


