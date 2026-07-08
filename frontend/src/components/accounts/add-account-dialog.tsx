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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PIN_LENGTH } from "@/lib/auth/types";
import type { CreateAccountRequest } from "@/lib/accounts/types";

type AddAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: CreateAccountRequest) => Promise<void>;
};

export function AddAccountDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddAccountDialogProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [temporaryPin, setTemporaryPin] = useState("");
  const [grantAdmin, setGrantAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = name.trim();
  const trimmedUsername = username.trim();
  const canSubmit =
    trimmedName.length > 0 &&
    trimmedUsername.length > 0 &&
    temporaryPin.length === PIN_LENGTH &&
    (!grantAdmin || adminPin.length === PIN_LENGTH) &&
    !isSubmitting;

  const resetForm = () => {
    setName("");
    setUsername("");
    setTemporaryPin("");
    setGrantAdmin(false);
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

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: trimmedName,
        username: trimmedUsername,
        temporary_pin: temporaryPin,
        grant_admin: grantAdmin,
        admin_pin: grantAdmin ? adminPin : undefined,
      });
      handleOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create account."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {open ? (
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add account</DialogTitle>
              <DialogDescription>
                Create a staff or admin account with a temporary PIN. They will
                choose their own PIN on first sign-in.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-account-name">Name</Label>
                <Input
                  autoComplete="name"
                  disabled={isSubmitting}
                  id="add-account-name"
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Maria Lopez"
                  value={name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-account-username">Username</Label>
                <Input
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  disabled={isSubmitting}
                  id="add-account-username"
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. maria"
                  spellCheck={false}
                  value={username}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-account-temporary-pin">Temporary PIN</Label>
                <PinInput
                  disabled={isSubmitting}
                  id="add-account-temporary-pin"
                  onChange={(value) => {
                    setTemporaryPin(value);
                    setError(null);
                  }}
                  value={temporaryPin}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-3">
                <div className="space-y-0.5">
                  <Label htmlFor="add-account-grant-admin">
                    Grant admin privileges
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Admins can upload files and manage team accounts.
                  </p>
                </div>
                <Switch
                  checked={grantAdmin}
                  disabled={isSubmitting}
                  id="add-account-grant-admin"
                  onCheckedChange={(checked) => {
                    setGrantAdmin(checked);
                    if (!checked) {
                      setAdminPin("");
                    }
                    setError(null);
                  }}
                />
              </div>

              {grantAdmin ? (
                <div className="space-y-2">
                  <Label htmlFor="add-account-admin-pin">
                    Confirm your PIN
                  </Label>
                  <PinInput
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    id="add-account-admin-pin"
                    onChange={(value) => {
                      setAdminPin(value);
                      setError(null);
                    }}
                    value={adminPin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Re-enter your PIN to confirm granting admin access.
                  </p>
                </div>
              ) : null}

              {error ? (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
            </div>

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
                {isSubmitting ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
