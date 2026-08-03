import type { ReactNode } from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/** Crisp field chrome — owned by Input; use for groups (chat composer, etc.). */
export const INPUT_SHELL =
  "rounded-lg border border-foreground/20 bg-background transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40"

/** Text control styles shared by bare Input and InputGroupControl. */
export const INPUT_CONTROL =
  "min-w-0 bg-transparent text-sm leading-normal text-foreground outline-none placeholder:text-muted-foreground/65 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"

type InputProps = InputPrimitive.Props & {
  /** Trailing actions (send, mic, …). Switches to group chrome owned by Input. */
  trailing?: ReactNode
  groupClassName?: string
}

function Input({ className, trailing, groupClassName, ...props }: InputProps) {
  if (trailing) {
    return (
      <div
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-0.5 py-0.5 pl-3.5 pr-0.5",
          INPUT_SHELL,
          groupClassName
        )}
        data-slot="input-group"
      >
        <InputPrimitive
          data-slot="input"
          className={cn(INPUT_CONTROL, "h-full flex-1 truncate", className)}
          {...props}
        />
        {trailing}
      </div>
    )
  }

  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        "h-10 w-full px-3.5",
        INPUT_SHELL,
        INPUT_CONTROL,
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
