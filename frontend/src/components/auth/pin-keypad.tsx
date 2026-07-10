"use client";

import { IconBackspace } from "@tabler/icons-react";
import { PIN_LENGTH } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const KEYPAD_KEYS = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
] as const;

type PinKeypadProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
};

export function PinKeypad({
  value,
  onChange,
  disabled = false,
  id,
}: PinKeypadProps) {
  const appendDigit = (digit: string) => {
    if (disabled || value.length >= PIN_LENGTH) {
      return;
    }

    onChange(`${value}${digit}`);
  };

  const removeDigit = () => {
    if (disabled || value.length === 0) {
      return;
    }

    onChange(value.slice(0, -1));
  };

  return (
    <div className="space-y-5" id={id}>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-foreground">Enter Passcode</p>
        <div
          aria-label={`Passcode, ${value.length} of ${PIN_LENGTH} digits entered`}
          aria-live="polite"
          className="flex items-center justify-center gap-3"
          role="status"
        >
          {Array.from({ length: PIN_LENGTH }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                "size-3 rounded-full border-2 transition-colors",
                index < value.length
                  ? "border-foreground bg-foreground"
                  : "border-foreground/35 bg-transparent"
              )}
            />
          ))}
        </div>
      </div>

      <div
        aria-label="Passcode keypad"
        className="mx-auto grid w-fit grid-cols-3 gap-x-5 gap-y-3"
        role="group"
      >
        {KEYPAD_KEYS.map(({ digit, letters }) => (
          <button
            key={digit}
            aria-label={`Digit ${digit}`}
            className="flex size-16 flex-col items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 active:bg-muted/70 disabled:pointer-events-none disabled:opacity-50"
            disabled={disabled}
            onClick={() => appendDigit(digit)}
            type="button"
          >
            <span className="text-2xl font-medium leading-none">{digit}</span>
            {letters ? (
              <span className="mt-0.5 text-[9px] font-semibold tracking-[0.12em] text-muted-foreground">
                {letters}
              </span>
            ) : (
              <span className="mt-0.5 h-2.5" aria-hidden="true" />
            )}
          </button>
        ))}

        <span aria-hidden="true" className="size-16" />

        <button
          aria-label="Digit 0"
          className="flex size-16 flex-col items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 active:bg-muted/70 disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
          onClick={() => appendDigit("0")}
          type="button"
        >
          <span className="text-2xl font-medium leading-none">0</span>
          <span className="mt-0.5 h-2.5" aria-hidden="true" />
        </button>

        <button
          aria-label="Delete last digit"
          className="flex size-16 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/60 active:bg-muted/50 disabled:pointer-events-none disabled:opacity-40"
          disabled={disabled || value.length === 0}
          onClick={removeDigit}
          type="button"
        >
          <IconBackspace aria-hidden="true" className="size-6" stroke={1.8} />
        </button>
      </div>
    </div>
  );
}
