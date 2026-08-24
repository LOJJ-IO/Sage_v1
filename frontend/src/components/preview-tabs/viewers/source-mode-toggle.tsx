"use client";

import { cn } from "@/lib/utils";

type SourceMode = "raw" | "rendered";

type SourceModeToggleProps = {
  value: SourceMode;
  onChange: (next: SourceMode) => void;
};

/** Raw / Preview segmented control — shared by the docx and md viewers. */
export function SourceModeToggle({ value, onChange }: SourceModeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-md border border-border p-0.5 text-xs">
      {(["rendered", "raw"] as const).map((mode) => (
        <button
          className={cn(
            "rounded px-2 py-0.5 transition-colors",
            value === mode
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          key={mode}
          onClick={() => onChange(mode)}
          type="button"
        >
          {mode === "rendered" ? "Preview" : "Raw"}
        </button>
      ))}
    </div>
  );
}
