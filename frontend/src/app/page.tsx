"use client";

import {
  IconEyeQuestion,
  IconFile,
  IconFilter2Spark,
  IconFilter2Up,
  IconUpload,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";

const MIN_SIDE_WIDTH = 12;
const MIN_MIDDLE_WIDTH = 16;
const DEFAULT_SIDE_WIDTH = 30;
const ICON_SIZE = 20;
const ICON_STROKE = 2.6;

function TablerIcon({
  icon: Icon,
}: {
  icon: typeof IconFile;
}) {
  return (
    <Icon
      aria-hidden="true"
      className="text-current"
      size={ICON_SIZE}
      stroke={ICON_STROKE}
    />
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
      className="group relative flex size-8 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-950"
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

  return (
    <main className="flex min-h-screen flex-col bg-white text-black">
      <header className="relative h-12 border-b border-neutral-200 bg-white">
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
          <div className="mx-2 h-5 w-px bg-neutral-200" />
          <HeaderIconButton iconClass="codicon-folder-library" label="Files" />
          <HeaderIconButton iconClass="codicon-search" label="Search" />
          <HeaderIconButton
            icon={<TablerIcon icon={IconUpload} />}
            label="Upload"
          />
          <HeaderIconButton iconClass="codicon-bookmark" label="Bookmarks" />
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
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
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: `${leftColumnWidth} 0.125rem minmax(0, 1fr) 0.125rem ${rightColumnWidth}`,
        }}
      >
        <section className="flex h-full min-w-0 flex-col overflow-hidden bg-neutral-100">
          <header className="flex h-12 shrink-0 items-center justify-center border-b border-neutral-200 bg-neutral-100">
            <div className="flex items-center gap-1">
              <HeaderIconButton
                icon={<TablerIcon icon={IconFilter2Up} />}
                label="Sort"
              />
              <HeaderIconButton
                iconClass="codicon-new-folder"
                label="New folder"
              />
              <HeaderIconButton
                icon={<TablerIcon icon={IconFilter2Spark} />}
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
          <div className="min-h-0 flex-1" />
        </section>
        <div className="relative h-full">
          <button
            aria-label="Resize left column"
            className="group absolute left-1/2 top-0 z-10 flex h-full w-4 -translate-x-1/2 cursor-col-resize touch-none justify-center bg-transparent transition-colors hover:bg-neutral-200/20"
            onPointerDown={() => {
              setIsLeftVisible(true);
              startResize("left");
            }}
            type="button"
          >
            <span className="h-full w-0.5 bg-neutral-300 transition-colors group-hover:bg-neutral-500" />
          </button>
        </div>
        <section className="h-full bg-white" />
        <div className="relative h-full">
          <button
            aria-label="Resize right column"
            className="group absolute left-1/2 top-0 z-10 flex h-full w-4 -translate-x-1/2 cursor-col-resize touch-none justify-center bg-transparent transition-colors hover:bg-neutral-200/20"
            onPointerDown={() => {
              setIsRightVisible(true);
              startResize("right");
            }}
            type="button"
          >
            <span className="h-full w-0.5 bg-neutral-300 transition-colors group-hover:bg-neutral-500" />
          </button>
        </div>
        <section className="h-full bg-neutral-100" />
      </div>
    </main>
  );
}


