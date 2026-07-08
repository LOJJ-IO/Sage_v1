"use client";

import { IconPlus, IconUsers } from "@tabler/icons-react";

import {
  AccountRoleBadges,
  formatAccountDate,
  inactiveCardClass,
  inactiveTableRowClass,
  inactiveTextClass,
} from "@/components/accounts/account-role-badge";
import { AccountRowMenu } from "@/components/accounts/account-row-menu";
import { Button } from "@/components/ui/button";
import type { Account } from "@/lib/accounts/types";
import { cn } from "@/lib/utils";

type AccountsTableProps = {
  accounts: Account[];
  onResetPin: (account: Account) => void;
  onGrantAdmin: (account: Account) => void;
  onRevokeAdmin: (account: Account) => void;
  onDeactivate: (account: Account) => void;
  onReactivate: (account: Account) => void;
};

function rowCellClass(extra?: string) {
  return cn("px-4 py-3", extra);
}

export function AccountsTable({
  accounts,
  onResetPin,
  onGrantAdmin,
  onRevokeAdmin,
  onDeactivate,
  onReactivate,
}: AccountsTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-foreground">
          <IconUsers aria-hidden="true" className="size-6" stroke={2.2} />
        </div>
        <h2 className="font-heading text-base font-medium text-foreground">
          No accounts yet
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Add your first team member to give them access to Sage on the store
          floor.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Username
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Role
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.id}
                className={cn(
                  "border-b border-border last:border-b-0",
                  inactiveTableRowClass(account.is_active)
                )}
              >
                <td
                  className={rowCellClass(
                    cn("font-medium", inactiveTextClass(account.is_active))
                  )}
                >
                  {account.name}
                </td>
                <td
                  className={rowCellClass(
                    cn("font-medium", inactiveTextClass(account.is_active))
                  )}
                >
                  {account.username}
                </td>
                <td className={rowCellClass()}>
                  <AccountRoleBadges
                    account={account}
                    inactive={!account.is_active}
                  />
                </td>
                <td
                  className={rowCellClass(
                    inactiveTextClass(account.is_active)
                  )}
                >
                  {formatAccountDate(account.created_at)}
                </td>
                <td className="px-4 py-3">
                  <AccountRowMenu
                    account={account}
                    onDeactivate={onDeactivate}
                    onGrantAdmin={onGrantAdmin}
                    onReactivate={onReactivate}
                    onResetPin={onResetPin}
                    onRevokeAdmin={onRevokeAdmin}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {accounts.map((account) => (
          <article
            key={account.id}
            className={cn(
              "rounded-2xl border border-border bg-card p-4",
              inactiveCardClass(account.is_active)
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <h2
                  className={cn(
                    "truncate font-medium",
                    inactiveTextClass(account.is_active)
                  )}
                >
                  {account.name}
                </h2>
                <p
                  className={cn(
                    "truncate text-sm",
                    inactiveTextClass(account.is_active)
                  )}
                >
                  {account.username}
                </p>
                <AccountRoleBadges
                  account={account}
                  inactive={!account.is_active}
                />
                <p
                  className={cn(
                    "text-sm",
                    inactiveTextClass(account.is_active)
                  )}
                >
                  Created {formatAccountDate(account.created_at)}
                </p>
              </div>
              <div>
                <AccountRowMenu
                  account={account}
                  onDeactivate={onDeactivate}
                  onGrantAdmin={onGrantAdmin}
                  onReactivate={onReactivate}
                  onResetPin={onResetPin}
                  onRevokeAdmin={onRevokeAdmin}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function AddAccountButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} type="button">
      <IconPlus aria-hidden="true" className="size-4" stroke={2.2} />
      Add account
    </Button>
  );
}
