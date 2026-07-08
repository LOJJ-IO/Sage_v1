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
import type { Account } from "@/lib/accounts/types";

type ResetPinDialogProps = {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (accountId: string, temporaryPin: string) => Promise<void>;
};

export function ResetPinDialog({
  account,
  open,
  onOpenChange,
  onSubmit,
}: ResetPinDialogProps) {
  const [temporaryPin, setTemporaryPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = temporaryPin.length === PIN_LENGTH && !isSubmitting;

  const resetForm = () => {
    setTemporaryPin("");
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

    if (!account || !canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(account.id, temporaryPin);
      handleOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to reset PIN."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {open && account ? (
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Reset PIN</DialogTitle>
              <DialogDescription>
                Set a new temporary PIN for{" "}
                <span className="font-medium text-foreground">
                  {account.username}
                </span>
                . They must change it on next sign-in.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="reset-pin-temporary-pin">Temporary PIN</Label>
              <PinInput
                disabled={isSubmitting}
                id="reset-pin-temporary-pin"
                onChange={(value) => {
                  setTemporaryPin(value);
                  setError(null);
                }}
                value={temporaryPin}
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
                {isSubmitting ? "Resetting…" : "Reset PIN"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
