"use client";

import { useState, type FormEvent } from "react";

import { PinInput } from "@/components/auth/pin-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShellDialog } from "@/components/ui/shell-dialog";
import { Switch } from "@/components/ui/switch";
import { PIN_LENGTH } from "@/lib/auth/types";
import type { CreateAccountRequest } from "@/lib/accounts/types";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "name",
    title: "Name",
    description: "Their full name.",
  },
  {
    id: "username",
    title: "Username",
    description: "How they sign in.",
  },
  {
    id: "pin",
    title: "Temporary PIN",
    description: "A short code for now. They can change it later.",
  },
  {
    id: "role",
    title: "Role",
    description: "Most people are staff. Admins can manage the workspace.",
  },
] as const;

type StepIndex = 0 | 1 | 2 | 3;

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
  const [step, setStep] = useState<StepIndex>(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [temporaryPin, setTemporaryPin] = useState("");
  const [grantAdmin, setGrantAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = name.trim();
  const trimmedUsername = username.trim();
  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const canAdvanceName = trimmedName.length > 0;
  const canAdvanceUsername = trimmedUsername.length > 0;
  const canAdvancePin = temporaryPin.length === PIN_LENGTH;
  const canSubmitRole =
    (!grantAdmin || adminPin.length === PIN_LENGTH) && !isSubmitting;

  const canAdvance =
    step === 0
      ? canAdvanceName
      : step === 1
        ? canAdvanceUsername
        : step === 2
          ? canAdvancePin
          : canSubmitRole;

  const resetForm = () => {
    setStep(0);
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

  const goBack = () => {
    setError(null);
    setStep((current) =>
      current > 0 ? ((current - 1) as StepIndex) : current
    );
  };

  const goNext = () => {
    if (!canAdvance || isLastStep) {
      return;
    }

    setError(null);
    setStep((current) => (current + 1) as StepIndex);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isLastStep) {
      goNext();
      return;
    }

    if (
      !canAdvanceName ||
      !canAdvanceUsername ||
      !canAdvancePin ||
      !canSubmitRole
    ) {
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
    <ShellDialog
      description={currentStep.description}
      footer={
        <>
          {step === 0 ? (
            <Button
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          ) : (
            <Button
              disabled={isSubmitting}
              onClick={goBack}
              type="button"
              variant="outline"
            >
              Back
            </Button>
          )}
          <Button disabled={!canAdvance} type="submit">
            {isLastStep
              ? isSubmitting
                ? "Creating…"
                : "Create account"
              : "Next"}
          </Button>
        </>
      }
      headerExtra={
        <div aria-hidden="true" className="flex gap-1.5 pt-2">
          {STEPS.map((item, index) => (
            <span
              key={item.id}
              className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
            >
              <span
                className={cn(
                  "block h-full origin-left rounded-full bg-foreground transition-transform duration-150 ease-out",
                  index <= step ? "scale-x-100" : "scale-x-0"
                )}
              />
            </span>
          ))}
        </div>
      }
      kind="form"
      onOpenChange={handleOpenChange}
      onSafeExit={() => handleOpenChange(false)}
      onSubmit={handleSubmit}
      open={open}
      size="sm"
      title="Add account"
    >
      <div className="space-y-4">
        {step === 0 ? (
          <div className="flex flex-col gap-[0.95rem]">
            <Label htmlFor="add-account-name">Name</Label>
            <Input
              autoComplete="name"
              autoFocus
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
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-[0.95rem]">
            <Label htmlFor="add-account-username">Username</Label>
            <Input
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              autoFocus
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
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-[0.95rem]">
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
        ) : null}

        {step === 3 ? (
          <>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="add-account-grant-admin">
                  Grant admin privileges
                </Label>
                <p className="text-xs text-muted-foreground">
                  Admins can upload files and manage people.
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
              <div className="flex flex-col gap-[0.95rem]">
                <Label htmlFor="add-account-admin-pin">Confirm your PIN</Label>
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
                  Type your PIN again to make them an admin.
                </p>
              </div>
            ) : null}
          </>
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
    </ShellDialog>
  );
}
