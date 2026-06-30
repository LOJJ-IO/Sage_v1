"use client";

import { useCallback, useState } from "react";

const MIN_SIDE_WIDTH = 12;
const MIN_MIDDLE_WIDTH = 16;
const DEFAULT_SIDE_WIDTH = 30;

export default function Home() {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_SIDE_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_SIDE_WIDTH);
  const [isLeftVisible, setIsLeftVisible] = useState(true);
  const [isRightVisible, setIsRightVisible] = useState(true);

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
      <header className="relative h-14 border-b border-neutral-200 bg-white">
        <button
          aria-label={
            isLeftVisible ? "Hide left side panel" : "Show left side panel"
          }
          className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-950"
          onClick={() => setIsLeftVisible((visible) => !visible)}
          type="button"
        >
          <span
            className={`codicon [-webkit-text-stroke:0.35px_currentColor] ${
              isLeftVisible
                ? "codicon-layout-sidebar-left-off"
                : "codicon-layout-sidebar-left"
            }`}
          />
        </button>
        <button
          aria-label={
            isRightVisible ? "Hide right side panel" : "Show right side panel"
          }
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-950"
          onClick={() => setIsRightVisible((visible) => !visible)}
          type="button"
        >
          <span
            className={`codicon [-webkit-text-stroke:0.35px_currentColor] ${
              isRightVisible
                ? "codicon-layout-sidebar-right-off"
                : "codicon-layout-sidebar-right"
            }`}
          />
        </button>
      </header>

      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: `${leftColumnWidth} 0.125rem minmax(0, 1fr) 0.125rem ${rightColumnWidth}`,
        }}
      >
        <section className="h-full bg-neutral-100" />
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


