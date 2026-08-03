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
import { useCallback, useEffect, useState } from "react";
import { FileLibraryPanel } from "@/components/files/file-library-panel";
import { OrganizationDialog } from "@/components/accounts/organization-dialog";
import { ProfileMenu } from "@/components/auth/profile-menu";
import { RequireAuth } from "@/components/auth/require-auth";
import {
  CitationSources,
  type CitationSource,
} from "@/components/ask/citation-sources";
import { PreviewCenterPanel } from "@/components/preview-tabs";
import { ConfigureChatDialog } from "@/components/settings/configure-chat-dialog";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import { useFileLibrary } from "@/hooks/use-file-library";
import { useSyncRemovedPreviewTabs } from "@/hooks/use-sync-removed-preview-tabs";
import { getUserRole } from "@/lib/auth/session";
import type { AskCitation } from "@/lib/ask/api";
import { askSage, isBackendConfigured } from "@/lib/ask/api";
import type { LibraryFile } from "@/lib/file-upload";
import { fileTypeFromFilename } from "@/lib/file-upload";
import { usePreviewTabsStore } from "@/lib/preview-tabs/store";
import { ApiError } from "@/lib/api/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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
    <Empty className="h-full border-none px-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Codicon iconClass="codicon-folder-library" size={ICON_SIZE_EMPTY} />
        </EmptyMedia>
        <EmptyTitle>No files yet</EmptyTitle>
        <EmptyDescription>
          Upload documents to populate your file tree and keep everything in one
          place.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onUpload} size="sm" type="button">
          <TablerIcon icon={IconUpload} size={ICON_SIZE_SM} />
          Upload files
        </Button>
      </EmptyContent>
    </Empty>
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
      <Empty className="h-full border-none px-4">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TablerIcon icon={IconMessageCircle} size={ICON_SIZE_EMPTY} />
          </EmptyMedia>
          <EmptyTitle>No documents yet</EmptyTitle>
          <EmptyDescription>
            Upload documents first so I can answer questions about them.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onUpload} size="sm" type="button">
            <TablerIcon icon={IconUpload} size={ICON_SIZE_SM} />
            Upload files
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="h-full border-none px-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TablerIcon icon={IconMessageCircle} size={ICON_SIZE_EMPTY} />
        </EmptyMedia>
        <EmptyTitle>Ask AI</EmptyTitle>
        <EmptyDescription>
          Ask about SOPs, pricing, returns, and more. I&apos;ll look across your
          uploaded docs.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: AskCitation[];
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Local-only reply when NEXT_PUBLIC_API_URL isn't set (standalone UI demo). */
function buildLocalAssistantReply(question: string): string {
  const trimmed = question.trim();
  return (
    `I received your question (“${trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed}”), ` +
    "but no backend is configured (NEXT_PUBLIC_API_URL is unset) — so I can’t look up your uploaded docs."
  );
}

function AskAiMessageList({
  messages,
  onOpenSource,
}: {
  messages: ChatMessage[];
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
          <div className="whitespace-pre-wrap">{message.content}</div>
          {message.role === "assistant" && message.citations && message.citations.length > 0 ? (
            <CitationSources
              citations={message.citations}
              onOpenSource={onOpenSource}
            />
          ) : null}
        </div>
      ))}
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
      <div className="flex min-w-0 items-center gap-0.5 rounded-full border border-border bg-background py-1 pl-4 pr-0.5 shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
        <input
          className="min-w-0 flex-1 truncate bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
              ? "Ask about return policy, pricing, or store procedures..."
              : "Upload documents to start asking..."
          }
          type="text"
          value={message}
        />
        <button
          aria-label="Voice input"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          disabled={!hasFiles}
          type="button"
        >
          <TablerIcon icon={IconMicrophone} />
        </button>
        <button
          aria-label="Send message"
          className={
            canSend
              ? "flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
              : "flex size-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-muted-foreground"
          }
          disabled={!canSend}
          onClick={send}
          type="button"
        >
          <TablerIcon icon={IconArrowUp} />
        </button>
      </div>
    </div>
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
  tooltipPlacement = "bottom",
}: {
  label: string;
  iconClass?: string;
  icon?: ReactNode;
  onClick?: () => void;
  tooltipPlacement?: "bottom" | "left" | "right";
}) {
  const sideOffset = tooltipPlacement === "bottom" ? 6 : 8;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={label}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
    error,
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
  const [chatTitle, setChatTitle] = useState("Title");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const handleSendMessage = useCallback((content: string) => {
    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content,
    };
    setMessages((current) => [...current, userMessage]);

    const backendOn = isBackendConfigured();

    if (!backendOn) {
      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: buildLocalAssistantReply(content),
      };
      setMessages((current) => [...current, assistantMessage]);
      return;
    }

    void askSage(content)
      .then((result) => {
        const assistantMessage: ChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content: result.answer,
          citations: result.limited ? undefined : result.citations,
        };
        setMessages((current) => [...current, assistantMessage]);
      })
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? err.message
            : "Something went wrong reaching Sage. Try again.";
        const assistantMessage: ChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content: message,
        };
        setMessages((current) => [...current, assistantMessage]);
      });
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setChatTitle("Title");
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
            <HeaderIconButton iconClass="codicon-search" label="Search" />
            <HeaderIconButton
              icon={<TablerIcon icon={IconUpload} />}
              label="Upload"
              onClick={openFilePicker}
            />
            <HeaderIconButton
              icon={<TablerIcon icon={IconBookmark} />}
              label="Bookmarks"
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
                icon={<TablerIcon icon={IconArrowsSort} />}
                label="Sort"
              />
              <HeaderIconButton
                iconClass="codicon-new-folder"
                label="New folder"
              />
              <HeaderIconButton
                icon={<TablerIcon icon={IconWand} />}
                label="Auto-Sort"
              />
              <HeaderIconButton
                icon={<TablerIcon icon={IconEyeQuestion} />}
                label="Auto-reveal current file"
              />
              <HeaderIconButton
                iconClass="codicon-collapse-all"
                label="Collapse all"
              />
            </HeaderIconGroup>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {error ? (
              <p
                className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {files.length > 0 ? (
              <FileLibraryPanel
                files={files}
                onDeleteFile={removeFile}
                onEditTags={updateTags}
                onOpenFile={handleOpenFile}
                onReplaceFile={openReplacePicker}
                onToggleBookmark={toggleBookmark}
              />
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
        <PreviewCenterPanel filesEmpty={files.length === 0} />
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
          <header className="flex min-w-0 h-14 w-full shrink-0 items-center gap-2 border-b border-border px-2">
            <input
              aria-label="Chat title"
              className="h-8 w-64 min-w-0 max-w-[calc(100%-7.5rem)] shrink truncate rounded-md border border-border bg-transparent px-2 text-sm font-semibold text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              onChange={(event) => setChatTitle(event.target.value)}
              value={chatTitle}
            />
            <div className="ml-auto shrink-0">
              <HeaderIconGroup>
                <HeaderIconButton
                  iconClass="codicon-add"
                  label="New chat"
                  onClick={handleNewChat}
                />
                <HeaderIconButton
                  iconClass="codicon-search"
                  label="Search chats"
                />
                <HeaderIconButton
                  iconClass="codicon-history"
                  label="History"
                />
                <HeaderIconButton
                  iconClass="codicon-settings"
                  label="Configure"
                  onClick={openConfigureChat}
                />
              </HeaderIconGroup>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {messages.length > 0 ? (
              <AskAiMessageList
                messages={messages}
                onOpenSource={handleOpenCitationSource}
              />
            ) : (
              <AskAiEmptyState
                hasFiles={files.length > 0}
                onUpload={openFilePicker}
              />
            )}
          </div>
          <AskAiChatInput
            hasFiles={files.length > 0}
            onSend={handleSendMessage}
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


