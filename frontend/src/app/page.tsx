"use client";

import {
  IconArrowsSort,
  IconEyeQuestion,
  IconFile,
  IconMessageCircle,
  IconMicrophone,
  IconMoon,
  IconSend,
  IconSun,
  IconUpload,
  IconWand,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const MIN_SIDE_WIDTH = 14;
const MIN_MIDDLE_WIDTH = 16;
const DEFAULT_SIDE_WIDTH = 30;
const ICON_SIZE = 20;
const ICON_SIZE_SM = 14;
const ICON_SIZE_EMPTY = 16;
const ICON_STROKE = 2.2;

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

function FilesEmptyState() {
  return (
    <Empty className="h-full border-none px-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <span
            aria-hidden="true"
            className="codicon codicon-folder-library [-webkit-text-stroke:0.35px_currentColor]"
            style={{ fontSize: ICON_SIZE_EMPTY }}
          />
        </EmptyMedia>
        <EmptyTitle>No files yet</EmptyTitle>
        <EmptyDescription>
          Upload documents to populate your file tree and keep everything in one
          place.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" type="button">
          <TablerIcon icon={IconUpload} size={ICON_SIZE_SM} />
          Upload files
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function AskAiEmptyState() {
  return (
    <Empty className="h-full border-none px-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TablerIcon icon={IconMessageCircle} size={ICON_SIZE_EMPTY} />
        </EmptyMedia>
        <EmptyTitle>Ask AI</EmptyTitle>
        <EmptyDescription>
          Send a message below to get started. Ask about SOPs, pricing,
          processes, and more. AI helps you find answers across your docs.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function AskAiChatInput() {
  const [message, setMessage] = useState("");

  return (
    <div className="shrink-0 bg-sidebar p-3">
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-background py-1.5 pl-4 pr-1.5 shadow-sm">
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask AI..."
          type="text"
          value={message}
        />
        <button
          aria-label="Voice input"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          type="button"
        >
          <TablerIcon icon={IconMicrophone} />
        </button>
        <button
          aria-label="Send message"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
          type="button"
        >
          <TablerIcon icon={IconSend} />
        </button>
      </div>
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
  const tooltipPosition = {
    bottom: "left-1/2 top-full mt-1.5 -translate-x-1/2",
    left: "right-full top-1/2 mr-2 -translate-y-1/2",
    right: "left-full top-1/2 ml-2 -translate-y-1/2",
  }[tooltipPlacement];
  const caretPosition = {
    bottom: "-top-1 left-1/2 -translate-x-1/2",
    left: "-right-1 top-1/2 -translate-y-1/2",
    right: "-left-1 top-1/2 -translate-y-1/2",
  }[tooltipPlacement];

  return (
    <button
      aria-label={label}
      className="group relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={onClick}
      type="button"
    >
      {icon ?? (
        <span
          className={`codicon ${iconClass} [-webkit-text-stroke:0.35px_currentColor]`}
          style={{ fontSize: ICON_SIZE }}
        />
      )}
      <span
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-black px-2.5 py-1.5 text-[12px] font-semibold leading-none text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${tooltipPosition}`}
      >
        <span
          className={`absolute size-2 rotate-45 bg-black ${caretPosition}`}
        />
        {label}
      </span>
    </button>
  );
}

export default function Home() {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_SIDE_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_SIDE_WIDTH);
  const [isLeftVisible, setIsLeftVisible] = useState(true);
  const [isRightVisible, setIsRightVisible] = useState(true);
  const [isFolded, setIsFolded] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

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
    isLeftVisible ? "0.125rem" : "0px",
    "minmax(0, 1fr)",
    isRightVisible ? "0.125rem" : "0px",
    rightColumnWidth,
  ].join(" ");

  return (
    <main className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <header className="relative h-12 border-b border-border bg-background">
        <div className="absolute left-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
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
          <div className="mx-2 h-5 w-px bg-border" />
          <HeaderIconButton iconClass="codicon-folder-library" label="Files" />
          <HeaderIconButton iconClass="codicon-search" label="Search" />
          <HeaderIconButton
            icon={<TablerIcon icon={IconUpload} />}
            label="Upload"
          />
          <HeaderIconButton iconClass="codicon-bookmark" label="Bookmarks" />
        </div>
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <HeaderIconButton
            icon={<TablerIcon icon={isDark ? IconSun : IconMoon} />}
            label={isDark ? "Light mode" : "Dark mode"}
            onClick={() => setIsDark((dark) => !dark)}
            tooltipPlacement="left"
          />
          <div className="mx-2 h-5 w-px bg-border" />
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
        </div>
      </header>

      <div
        className="grid min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{ gridTemplateColumns }}
      >
        <section className="flex h-full min-w-0 flex-col overflow-hidden bg-sidebar">
          <header className="flex h-12 shrink-0 items-center justify-center border-b border-border bg-sidebar">
            <div className="flex items-center gap-1">
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
                iconClass={isFolded ? "codicon-unfold" : "codicon-fold"}
                label={isFolded ? "Unfold" : "Fold"}
                onClick={() => setIsFolded((folded) => !folded)}
              />
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <FilesEmptyState />
          </div>
        </section>
        <div className="relative h-full">
          {isLeftVisible ? (
            <button
              aria-label="Resize left column"
              className="group absolute left-1/2 top-0 z-10 flex h-full w-4 -translate-x-1/2 cursor-col-resize touch-none justify-center bg-transparent transition-colors hover:bg-muted/30"
              onPointerDown={() => {
                setIsLeftVisible(true);
                startResize("left");
              }}
              type="button"
            >
              <span className="h-full w-0.5 bg-border transition-colors group-hover:bg-muted-foreground" />
            </button>
          ) : null}
        </div>
        <section className="h-full min-w-0 overflow-hidden bg-background" />
        <div className="relative h-full">
          {isRightVisible ? (
            <button
              aria-label="Resize right column"
              className="group absolute left-1/2 top-0 z-10 flex h-full w-4 -translate-x-1/2 cursor-col-resize touch-none justify-center bg-transparent transition-colors hover:bg-muted/30"
              onPointerDown={() => {
                setIsRightVisible(true);
                startResize("right");
              }}
              type="button"
            >
              <span className="h-full w-0.5 bg-border transition-colors group-hover:bg-muted-foreground" />
            </button>
          ) : null}
        </div>
        <section className="flex h-full min-w-0 flex-col overflow-hidden bg-sidebar">
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <AskAiEmptyState />
          </div>
          <AskAiChatInput />
        </section>
      </div>
    </main>
  );
}


