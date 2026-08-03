"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type PdfScrollMode = "single" | "continuous";

const OPTIONS: { value: PdfScrollMode; label: string }[] = [
  { value: "continuous", label: "Continuous" },
  { value: "single", label: "Single" },
];

/**
 * Shared morph timing — caret rotate + option expand/collapse must use the
 * same duration and easing so they read as one motion, not a sequence.
 * (motion-design: on-screen morph → ease-in-out-cubic, ~240ms)
 */
const MORPH_MS = 240;
const MORPH_EASE = "cubic-bezier(0.645, 0.045, 0.355, 1)";
const morphStyle = {
  transitionDuration: `${MORPH_MS}ms`,
  transitionTimingFunction: MORPH_EASE,
} as const;

type PdfScrollModePillProps = {
  value: PdfScrollMode;
  onChange: (value: PdfScrollMode) => void;
};

/**
 * Expand-in-place pill: closed shows current mode + caret;
 * open reveals both options in the same shell. Caret points toward
 * expand (down) when closed and collapse (up) when open.
 */
export function PdfScrollModePill({ value, onChange }: PdfScrollModePillProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="inline-flex h-7 items-stretch overflow-hidden rounded-full border border-border bg-background text-xs shadow-sm"
    >
      {OPTIONS.map((option, index) => {
        const selected = value === option.value;
        const visible = open || selected;

        return (
          <div key={option.value} className="flex min-w-0 items-stretch">
            {index > 0 ? (
              <div
                aria-hidden
                className="shrink-0 bg-border"
                style={{
                  ...morphStyle,
                  transitionProperty: "width, opacity",
                  width: open ? 1 : 0,
                  opacity: open ? 1 : 0,
                }}
              />
            ) : null}
            {/*
              grid 0fr→1fr animates real width from frame 1 (unlike max-width),
              so it tracks the caret rotate instead of lagging behind it.
            */}
            <div
              className="grid min-w-0"
              style={{
                ...morphStyle,
                transitionProperty: "grid-template-columns",
                gridTemplateColumns: visible ? "1fr" : "0fr",
              }}
            >
              <div className="min-w-0 overflow-hidden">
                <button
                  aria-pressed={selected}
                  className={cn(
                    "h-7 whitespace-nowrap px-2.5 font-medium outline-none",
                    "transition-colors duration-[240ms] ease-[cubic-bezier(.645,.045,.355,1)]",
                    selected
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  onClick={() => {
                    if (!open) {
                      setOpen(true);
                      return;
                    }
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={{
                    ...morphStyle,
                    transitionProperty: "opacity",
                    opacity: visible ? 1 : 0,
                  }}
                  tabIndex={visible ? 0 : -1}
                  type="button"
                >
                  {option.label}
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div aria-hidden className="w-px shrink-0 bg-border" />
      <button
        aria-expanded={open}
        aria-label={open ? "Collapse scroll mode" : "Change scroll mode"}
        className="flex items-center px-1.5 text-muted-foreground outline-none hover:bg-muted/50 hover:text-foreground focus-visible:bg-muted"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <IconChevronDown
          aria-hidden
          className="size-3.5 origin-center"
          stroke={2.2}
          style={{
            ...morphStyle,
            transitionProperty: "transform",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
    </div>
  );
}
