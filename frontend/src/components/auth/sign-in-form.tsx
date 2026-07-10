"use client";

import { IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { LockIconVideo } from "@/components/auth/lock-icon-video";
import { PinKeypad } from "@/components/auth/pin-keypad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginError, PIN_LENGTH } from "@/lib/auth/types";
import { login, storeAuthToken } from "@/lib/auth/login";
import {
  playLockFailClip,
  playLockSuccessClip,
  resetLockVideo,
} from "@/lib/auth/lock-video-playback";
import { storeUserRole } from "@/lib/auth/session";

export function SignInForm() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const submittingRef = useRef(false);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedUsername = username.trim();

  const resetLockIcon = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    resetLockVideo(video);
  }, []);

  const authenticate = useCallback(
    async (nextPin: string) => {
      if (submittingRef.current) {
        return;
      }

      if (trimmedUsername.length === 0 || nextPin.length !== PIN_LENGTH) {
        return;
      }

      submittingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      const video = videoRef.current;

      try {
        const response = await login({
          username: trimmedUsername,
          pin: nextPin,
        });

        storeAuthToken(response.access_token);
        storeUserRole(response.role);

        if (video) {
          await playLockSuccessClip(video);
        }

        submittingRef.current = false;
        setIsSubmitting(false);

        if (response.must_change_pin) {
          router.push("/change-pin");
          return;
        }

        router.push("/");
      } catch (submitError) {
        if (video) {
          await playLockFailClip(video);
        }

        const message =
          submitError instanceof LoginError
            ? submitError.message
            : "Something went wrong. Try again.";
        const clearPin =
          submitError instanceof LoginError &&
          submitError.code === "invalid_credentials";

        setError(message);
        if (clearPin) {
          setPin("");
        }
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [router, trimmedUsername]
  );

  const handlePasscodeChange = (nextPin: string) => {
    if (nextPin.length === 1 && pin.length === 0) {
      resetLockIcon();
    }

    setPin(nextPin);
    if (error) {
      setError(null);
    }

    if (nextPin.length === PIN_LENGTH) {
      void authenticate(nextPin);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pin.length === PIN_LENGTH) {
      void authenticate(pin);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <LockIconVideo ref={videoRef} />
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
                if (error) {
                  setError(null);
                }
              }}
              placeholder="e.g. sage"
              spellCheck={false}
              value={username}
            />
          </div>

          <div className="space-y-2">
            <Label className="sr-only" htmlFor="passcode-keypad">
              Passcode
            </Label>
            <PinKeypad
              disabled={isSubmitting || trimmedUsername.length === 0}
              id="passcode-keypad"
              onChange={handlePasscodeChange}
              value={pin}
            />
            {trimmedUsername.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                Enter your username, then your passcode.
              </p>
            ) : null}
          </div>
        </form>

        <div className="mt-6">
          {error ? (
            <div
              className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3"
              role="alert"
            >
              <p className="min-w-0 flex-1 text-sm text-rose-950">{error}</p>
              <button
                aria-label="Dismiss error"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-rose-950/70 transition-colors hover:bg-rose-100 hover:text-rose-950"
                onClick={() => setError(null)}
                type="button"
              >
                <IconX aria-hidden="true" className="size-4" stroke={2.2} />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account? Ask your manager.
      </p>
    </div>
  );
}
