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
}: {
  account: Pick<Account, "role">;
  className?: string;
  inactive?: boolean;
}) {
  const variant = account.role === "admin" ? "admin" : "staff";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Badge
        className={cn(inactiveTextClass(!inactive))}
        variant={variant}
      >
        {account.role === "admin" ? "Admin" : "Staff"}
      </Badge>
    </div>
  );
}

export function formatAccountDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function inactiveTableRowClass(isActive: boolean) {
  return !isActive ? "bg-muted/20" : undefined;
}

export function inactiveCardClass(isActive: boolean) {
  return !isActive ? "bg-muted/20" : undefined;
}
