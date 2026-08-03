"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverPortal({ ...props }: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />;
}

function PopoverPositioner({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  ...props
}: PopoverPrimitive.Positioner.Props) {
  return (
    <PopoverPrimitive.Positioner
      align={align}
      className={cn("isolate z-50 outline-none", className)}
      data-slot="popover-positioner"
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function PopoverContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  anchor,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "side" | "sideOffset" | "anchor"
  >) {
  return (
    <PopoverPortal>
      <PopoverPositioner
        align={align}
        anchor={anchor}
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-max min-w-44 max-w-xs origin-(--transform-origin) rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </PopoverPositioner>
    </PopoverPortal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverPortal, PopoverPositioner };
