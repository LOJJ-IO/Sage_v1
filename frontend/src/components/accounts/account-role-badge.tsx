import type { Account } from "@/lib/accounts/types";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function inactiveTextClass(isActive: boolean) {
  return !isActive
    ? "text-muted-foreground line-through decoration-muted-foreground"
    : undefined;
}

export function AccountRoleBadges({
  account,
  className,
  inactive = false,
  isSelf = false,
}: {
  account: Pick<Account, "role">;
  className?: string;
  inactive?: boolean;
  isSelf?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Badge
        className={cn(inactive && inactiveTextClass(false))}
        variant={inactive ? "staff" : "admin"}
      >
        {account.role === "admin" ? "Admin" : "Staff"}
      </Badge>
      {isSelf ? <Badge variant="you">You</Badge> : null}
    </div>
  );
}

export function formatAccountDate(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

export function inactiveTableRowClass(isActive: boolean) {
  return !isActive ? "bg-muted/20" : undefined;
}

export function inactiveCardClass(isActive: boolean) {
  return !isActive ? "bg-muted/20" : undefined;
}
