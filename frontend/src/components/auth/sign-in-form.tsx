"use client";

import { IconLogin2 } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PinKeypad } from "@/components/auth/pin-keypad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginError, PIN_LENGTH } from "@/lib/auth/types";
import { login, storeAuthToken } from "@/lib/auth/login";
import { storeUserRole } from "@/lib/auth/session";

export function SignInForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedUsername = username.trim();
  const canSubmit =
    trimmedUsername.length > 0 &&
    pin.length === PIN_LENGTH &&
    !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await login({
        username: trimmedUsername,
        pin,
      });

      storeAuthToken(response.access_token);
      storeUserRole(response.role);

      if (response.must_change_pin) {
        router.push("/change-pin");
        return;
      }

      router.push("/");
    } catch (submitError) {
      if (submitError instanceof LoginError) {
        setError(submitError.message);
        if (submitError.code === "invalid_credentials") {
          setPin("");
        }
        return;
      }

      setError("Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-foreground">
            <IconLogin2 aria-hidden="true" className="size-6" stroke={2.2} />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Sign in to Sage
          </h1>
        </div>

        <form className="space-y-6" noValidate onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              disabled={isSubmitting}
              id="username"
              name="username"
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
            <Label htmlFor="pin-keypad">PIN</Label>
            <PinKeypad
              disabled={isSubmitting}
              id="pin-keypad"
              onChange={(nextPin) => {
                setPin(nextPin);
                setError(null);
              }}
              value={pin}
            />
          </div>

          {error ? (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <Button
            className="h-11 w-full text-base"
            disabled={!canSubmit}
            size="lg"
            type="submit"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account? Ask your manager.
      </p>
    </div>
  );
}
