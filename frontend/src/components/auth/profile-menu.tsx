"use client";

import { IconSettings } from "@tabler/icons-react";
import { useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ICON_SIZE = 20;
const ICON_STROKE = 2.2;

type ProfileMenuProps = {
  onOpenSettings: () => void;
};

export function ProfileMenu({ onOpenSettings }: ProfileMenuProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <Tooltip onOpenChange={setTooltipOpen} open={tooltipOpen}>
      <TooltipTrigger
        render={
          <button
            aria-label="Settings"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={() => {
              setTooltipOpen(false);
              onOpenSettings();
            }}
            type="button"
          />
        }
      >
        <IconSettings
          aria-hidden="true"
          className="shrink-0"
          size={ICON_SIZE}
          stroke={ICON_STROKE}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8} variant="compact">
        Settings
      </TooltipContent>
    </Tooltip>
  );
}
