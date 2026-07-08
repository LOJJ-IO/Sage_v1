import type { Account } from "@/lib/accounts/types";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AccountRoleBadges({
  account,
  className,
  inactive = false,
}: {
  account: Pick<Account, "role">;
  className?: string;
  inactive?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Badge
        className={cn(inactive && "inactive-account-badge")}
        variant="admin"
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
  return !isActive ? "inactive-account-row" : "";
}

export function inactiveCardClass(isActive: boolean) {
  return !isActive ? "inactive-account-card" : "";
}
