"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  "aria-label": string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  if (options.length === 2) {
    return (
      <div
        aria-label={ariaLabel}
        className={cn(
          "inline-flex w-fit items-center gap-0.5 rounded-full border border-border bg-background p-0.5 shadow-sm",
          className
        )}
        role="radiogroup"
      >
        {options.map((option, index) => (
          <div key={option.value} className="flex items-center">
            {index > 0 ? (
              <div
                aria-hidden="true"
                className="mx-0.5 h-5 w-px shrink-0 bg-border"
              />
            ) : null}
            <SegmentedItem
              onSelect={() => onChange(option.value)}
              selected={value === option.value}
            >
              {option.label}
            </SegmentedItem>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
      role="radiogroup"
    >
      {options.map((option) => (
        <SegmentedItem
          key={option.value}
          onSelect={() => onChange(option.value)}
          selected={value === option.value}
        >
          {option.label}
        </SegmentedItem>
      ))}
    </div>
  );
}

function SegmentedItem({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      aria-checked={selected}
      onClick={onSelect}
      role="radio"
      size="sm"
      type="button"
      variant={selected ? "default" : "outline"}
    >
      {children}
    </Button>
  );
}
