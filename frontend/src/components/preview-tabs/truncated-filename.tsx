"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Shared max width for stage title — tabs use fixed tab chrome width instead. */
export const PREVIEW_FILENAME_STAGE_MAX_CLASS = "max-w-md";

type TruncatedFilenameTextProps = {
  title: string;
  className?: string;
  maxWidthClass?: string;
};

/** Ellipsis label only — pair with a parent tooltip when needed. */
export function TruncatedFilenameText({
  title,
  className,
  maxWidthClass,
}: TruncatedFilenameTextProps) {
  return (
    <span
      className={cn("block min-w-0 truncate", maxWidthClass, className)}
    >
      {title}
    </span>
  );
}

type TruncatedFilenameProps = TruncatedFilenameTextProps;

/** Truncated label + tooltip (stage / standalone). */
export function TruncatedFilename(props: TruncatedFilenameProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<TruncatedFilenameText {...props} />}
      />
      <TooltipContent side="bottom" sideOffset={6} variant="compact">
        {props.title}
      </TooltipContent>
    </Tooltip>
  );
}
