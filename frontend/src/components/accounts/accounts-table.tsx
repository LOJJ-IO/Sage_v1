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
import { EmptyState } from "@/components/ui/empty";
import { SELF_ACCOUNT_ID, type Account } from "@/lib/accounts/types";
import { cn } from "@/lib/utils";

type AccountsTableProps = {
  accounts: Account[];
  currentUsername?: string | null;
  onResetPin: (account: Account) => void;
  onGrantAdmin: (account: Account) => void;
  onRevokeAdmin: (account: Account) => void;
  onDeactivate: (account: Account) => void;
  onReactivate: (account: Account) => void;
  onAddAccount?: () => void;
};

const EMPTY_ICON_SIZE = 16;
const EMPTY_ICON_STROKE = 2.2;

function AccountsEmptyState({ onAddAccount }: { onAddAccount?: () => void }) {
  return (
    <EmptyState
      action={
        onAddAccount ? (
          <Button onClick={onAddAccount} size="sm" type="button">
            <IconPlus
              aria-hidden="true"
              className="size-3.5"
              stroke={EMPTY_ICON_STROKE}
            />
            Add account
          </Button>
        ) : undefined
      }
      className="px-4 py-10"
      description="Add your first team member to give them access to Sage on the store floor."
      icon={
        <IconUsers
          aria-hidden="true"
          size={EMPTY_ICON_SIZE}
          stroke={EMPTY_ICON_STROKE}
        />
      }
      title="No accounts yet"
    />
  );
}

function rowCellClass(extra?: string) {
  return cn("px-4 py-3", extra);
}

export function AccountsTable({
  accounts,
  currentUsername,
  onResetPin,
  onGrantAdmin,
  onRevokeAdmin,
  onDeactivate,
  onReactivate,
  onAddAccount,
}: AccountsTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <AccountsEmptyState onAddAccount={onAddAccount} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {onAddAccount ? (
        <div className="flex justify-end">
          <AddAccountButton onClick={onAddAccount} />
        </div>
      ) : null}

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
              <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">
                Role
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">
                Created
              </th>
              <th className="w-0 whitespace-nowrap py-3 pl-2 pr-3 text-right font-medium text-muted-foreground">
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
                <td className={rowCellClass("whitespace-nowrap")}>
                  <AccountRoleBadges
                    account={account}
                    inactive={!account.is_active}
                    isSelf={account.username === currentUsername}
                  />
                </td>
                <td
                  className={rowCellClass(
                    cn("whitespace-nowrap", inactiveTextClass(account.is_active))
                  )}
                >
                  {formatAccountDate(account.created_at)}
                </td>
                <td className="w-0 whitespace-nowrap py-3 pl-2 pr-3 text-right">
                  {account.id === SELF_ACCOUNT_ID ? null : (
                    <AccountRowMenu
                      account={account}
                      onDeactivate={onDeactivate}
                      onGrantAdmin={onGrantAdmin}
                      onReactivate={onReactivate}
                      onResetPin={onResetPin}
                      onRevokeAdmin={onRevokeAdmin}
                    />
                  )}
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
                  isSelf={account.username === currentUsername}
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
                {account.id === SELF_ACCOUNT_ID ? null : (
                  <AccountRowMenu
                    account={account}
                    onDeactivate={onDeactivate}
                    onGrantAdmin={onGrantAdmin}
                    onReactivate={onReactivate}
                    onResetPin={onResetPin}
                    onRevokeAdmin={onRevokeAdmin}
                  />
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
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
