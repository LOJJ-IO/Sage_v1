"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AdminPrivilegesDialog } from "@/components/accounts/admin-privileges-dialog";
import { AddAccountDialog } from "@/components/accounts/add-account-dialog";
import {
  AccountsTable,
  AddAccountButton,
} from "@/components/accounts/accounts-table";
import { ResetPinDialog } from "@/components/accounts/reset-pin-dialog";
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

export function OrganizationView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [resetPinAccount, setResetPinAccount] = useState<Account | null>(null);
  const [deactivateAccountTarget, setDeactivateAccountTarget] =
    useState<Account | null>(null);
  const [adminPrivilegesTarget, setAdminPrivilegesTarget] =
    useState<Account | null>(null);
  const [adminPrivilegesMode, setAdminPrivilegesMode] =
    useState<AdminPrivilegesMode | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const refreshAccounts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const nextAccounts = await listAccounts();
      setAccounts(nextAccounts);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load accounts."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  useEffect(() => {
    if (!bannerMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setBannerMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [bannerMessage]);

  const handleCreateAccount = async (request: CreateAccountRequest) => {
    const account = await createAccount(request);
    await refreshAccounts();
    setBannerMessage(`Created account for ${account.name}.`);
  };

  const handleResetPin = async (accountId: string, temporaryPin: string) => {
    await resetAccountPin(accountId, { temporary_pin: temporaryPin });
    setBannerMessage("PIN reset. The account must change it on next sign-in.");
  };

  const handleDeactivate = async () => {
    if (!deactivateAccountTarget) {
      return;
    }

    setIsDeactivating(true);

    try {
      await deactivateAccount(deactivateAccountTarget.id);
      await refreshAccounts();
      setBannerMessage(`${deactivateAccountTarget.username} was deactivated.`);
      setDeactivateAccountTarget(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to deactivate account."
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (account: Account) => {
    try {
      await reactivateAccount(account.id);
      await refreshAccounts();
      setBannerMessage(`${account.username} was reactivated.`);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to reactivate account."
      );
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
      setBannerMessage(`${account.name} now has admin privileges.`);
      return;
    }

    if (adminPrivilegesMode === "revoke") {
      const account = await revokeAdminPrivileges(accountId, {
        admin_pin: adminPin,
      });
      await refreshAccounts();
      setBannerMessage(`${account.name} no longer has admin privileges.`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            aria-label="Back to workspace"
            className="-ml-2 inline-flex size-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href="/"
          >
            <span
              aria-hidden="true"
              className="codicon codicon-chevron-left text-foreground [-webkit-text-stroke:0.35px_currentColor]"
              style={{ fontSize: 20 }}
            />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Organization
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create accounts, reset PINs, and deactivate staff access.
            </p>
          </div>
        </div>
        <AddAccountButton onClick={() => setAddDialogOpen(true)} />
      </div>

      {bannerMessage ? (
        <div
          className="mb-4 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground"
          role="status"
        >
          {bannerMessage}
        </div>
      ) : null}

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

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          Loading accounts…
        </div>
      ) : (
        <AccountsTable
          accounts={accounts}
          onDeactivate={setDeactivateAccountTarget}
          onGrantAdmin={(account) => openAdminPrivilegesDialog(account, "grant")}
          onReactivate={handleReactivate}
          onResetPin={setResetPinAccount}
          onRevokeAdmin={(account) =>
            openAdminPrivilegesDialog(account, "revoke")
          }
        />
      )}

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
    </div>
  );
}
