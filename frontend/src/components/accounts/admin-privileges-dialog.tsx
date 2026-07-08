"use client";

import { useState, type FormEvent } from "react";

import { PinInput } from "@/components/auth/pin-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PIN_LENGTH } from "@/lib/auth/types";
import type { Account, AdminPrivilegesMode } from "@/lib/accounts/types";

type AdminPrivilegesDialogProps = {
  account: Account | null;
  mode: AdminPrivilegesMode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (accountId: string, adminPin: string) => Promise<void>;
};

export function AdminPrivilegesDialog({
  account,
  mode,
  open,
  onOpenChange,
  onSubmit,
}: AdminPrivilegesDialogProps) {
  const [adminPin, setAdminPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = adminPin.length === PIN_LENGTH && !isSubmitting;

  const resetForm = () => {
    setAdminPin("");
    setError(null);
    setIsSubmitting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!account || !mode || !canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(account.id, adminPin);
      handleOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update admin privileges."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGrant = mode === "grant";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {open && account && mode ? (
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {isGrant ? "Grant admin privileges" : "Remove admin privileges"}
              </DialogTitle>
              <DialogDescription>
                {isGrant ? (
                  <>
                    Give{" "}
                    <span className="font-medium text-foreground">
                      {account.name}
                    </span>{" "}
                    admin access to upload files and manage team accounts.
                    Confirm with your PIN to continue.
                  </>
                ) : (
                  <>
                    Remove admin access from{" "}
                    <span className="font-medium text-foreground">
                      {account.name}
                    </span>
                    . They will keep staff access to Sage. Confirm with your PIN
                    to continue.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="admin-privileges-pin">Confirm your PIN</Label>
              <PinInput
                autoComplete="current-password"
                disabled={isSubmitting}
                id="admin-privileges-pin"
                onChange={(value) => {
                  setAdminPin(value);
                  setError(null);
                }}
                value={adminPin}
              />
            </div>

            {error ? (
              <div
                className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                disabled={isSubmitting}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={!canSubmit} type="submit">
                {isSubmitting
                  ? "Saving…"
                  : isGrant
                    ? "Grant admin"
                    : "Remove admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
