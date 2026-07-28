"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddAccountDialog } from "@/components/accounts/add-account-dialog";
import { AdminPrivilegesDialog } from "@/components/accounts/admin-privileges-dialog";
import { AccountsTableSkeleton } from "@/components/accounts/accounts-table-skeleton";
import {
  AccountsTable,
} from "@/components/accounts/accounts-table";
import { ResetPinDialog } from "@/components/accounts/reset-pin-dialog";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createAccount,
  deactivateAccount,
  grantAdminPrivileges,
  listAccounts,
  reactivateAccount,
  resetAccountPin,
  revokeAdminPrivileges,
} from "@/lib/accounts/api";
import type {
  Account,
  AdminPrivilegesMode,
  CreateAccountRequest,
} from "@/lib/accounts/types";

type OrganizationViewProps = {
  /** When false, skip fetching (dialog closed). */
  active?: boolean;
};

export function OrganizationView({ active = true }: OrganizationViewProps) {
  const toast = useToast();
  /** `undefined` = never loaded successfully; skeleton uses this, not fetch flags. */
  const [accounts, setAccounts] = useState<Account[] | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [resetPinAccount, setResetPinAccount] = useState<Account | null>(null);
  const [deactivateAccountTarget, setDeactivateAccountTarget] =
    useState<Account | null>(null);
  const [adminPrivilegesTarget, setAdminPrivilegesTarget] =
    useState<Account | null>(null);
  const [adminPrivilegesMode, setAdminPrivilegesMode] =
    useState<AdminPrivilegesMode | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const hasAccountsRef = useRef(false);

  const refreshAccounts = useCallback(async () => {
    if (hasAccountsRef.current) {
      setIsRefreshing(true);
    }
    setLoadError(null);

    try {
      const nextAccounts = await listAccounts();
      setAccounts(nextAccounts);
      hasAccountsRef.current = true;
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load accounts."
      );
      toast.error({
        title: "Could not load accounts",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!active) {
      return;
    }

    void refreshAccounts();
  }, [active, refreshAccounts]);

  const handleCreateAccount = async (request: CreateAccountRequest) => {
    const account = await createAccount(request);
    await refreshAccounts();
    toast.success({
      title: "Account created",
      description: `${account.name} can sign in with their temporary PIN.`,
    });
  };

  const handleResetPin = async (accountId: string, temporaryPin: string) => {
    await resetAccountPin(accountId, { temporary_pin: temporaryPin });
    toast.info({
      title: "PIN reset",
      description: "The account must change it on next sign-in.",
    });
  };

  const handleDeactivate = async () => {
    if (!deactivateAccountTarget) {
      return;
    }

    setIsDeactivating(true);

    try {
      await deactivateAccount(deactivateAccountTarget.id);
      await refreshAccounts();
      toast.success({
        title: "Account deactivated",
        description: `${deactivateAccountTarget.username} can no longer sign in.`,
      });
      setDeactivateAccountTarget(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to deactivate account.";
      setLoadError(message);
      toast.error({
        title: "Could not deactivate account",
        description: message,
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (account: Account) => {
    try {
      await reactivateAccount(account.id);
      await refreshAccounts();
      toast.success({
        title: "Account reactivated",
        description: `${account.username} can sign in again.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reactivate account.";
      setLoadError(message);
      toast.error({
        title: "Could not reactivate account",
        description: message,
      });
    }
  };

  const openAdminPrivilegesDialog = (
    account: Account,
    mode: AdminPrivilegesMode
  ) => {
    setAdminPrivilegesTarget(account);
    setAdminPrivilegesMode(mode);
  };

  const handleAdminPrivileges = async (accountId: string, adminPin: string) => {
    if (adminPrivilegesMode === "grant") {
      const account = await grantAdminPrivileges(accountId, { admin_pin: adminPin });
      await refreshAccounts();
      toast.success({
        title: "Admin privileges granted",
        description: `${account.name} can manage organization settings.`,
      });
      return;
    }

    if (adminPrivilegesMode === "revoke") {
      const account = await revokeAdminPrivileges(accountId, {
        admin_pin: adminPin,
      });
      await refreshAccounts();
      toast.success({
        title: "Admin privileges removed",
        description: `${account.name} is now a staff account.`,
      });
    }
  };

  const renderAccountsContent = () => {
    if (accounts === undefined) {
      if (loadError) {
        return null;
      }

      return (
        <div role="status">
          <span className="sr-only">Loading accounts</span>
          <AccountsTableSkeleton />
        </div>
      );
    }

    return (
      <>
        {isRefreshing ? (
          <p className="mb-2 text-xs text-muted-foreground" role="status">
            Syncing accounts…
          </p>
        ) : null}
        <AccountsTable
          accounts={accounts}
          onAddAccount={() => setAddDialogOpen(true)}
          onDeactivate={setDeactivateAccountTarget}
          onGrantAdmin={(account) => openAdminPrivilegesDialog(account, "grant")}
          onReactivate={handleReactivate}
          onResetPin={setResetPinAccount}
          onRevokeAdmin={(account) =>
            openAdminPrivilegesDialog(account, "revoke")
          }
        />
      </>
    );
  };

  return (
    <>
      {loadError ? (
        <div
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          role="alert"
        >
          {loadError}
          {loadError.includes("signed in") ? (
            <div className="mt-2">
              <Link
                className="font-medium underline underline-offset-4"
                href="/sign-in"
              >
                Go to sign in
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {renderAccountsContent()}

      <AddAccountDialog
        onOpenChange={setAddDialogOpen}
        onSubmit={handleCreateAccount}
        open={addDialogOpen}
      />

      <ResetPinDialog
        account={resetPinAccount}
        onOpenChange={(open) => {
          if (!open) {
            setResetPinAccount(null);
          }
        }}
        onSubmit={handleResetPin}
        open={resetPinAccount !== null}
      />

      <AdminPrivilegesDialog
        account={adminPrivilegesTarget}
        mode={adminPrivilegesMode}
        onOpenChange={(open) => {
          if (!open) {
            setAdminPrivilegesTarget(null);
            setAdminPrivilegesMode(null);
          }
        }}
        onSubmit={handleAdminPrivileges}
        open={adminPrivilegesTarget !== null && adminPrivilegesMode !== null}
      />

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateAccountTarget(null);
          }
        }}
        open={deactivateAccountTarget !== null}
      >
        {deactivateAccountTarget ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate account</DialogTitle>
              <DialogDescription>
                {deactivateAccountTarget.username} will no longer be able to
                sign in. Their preferences, bookmarks, and chat history will be
                kept if you reactivate the account later.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                disabled={isDeactivating}
                onClick={() => setDeactivateAccountTarget(null)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={isDeactivating}
                onClick={() => void handleDeactivate()}
                variant="destructive"
              >
                {isDeactivating ? "Deactivating…" : "Deactivate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
