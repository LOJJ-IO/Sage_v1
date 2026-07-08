"use client";

import { IconBackspace } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { PIN_LENGTH } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

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
    if (value.length >= PIN_LENGTH) {
      return;
    }

    onChange(`${value}${digit}`);
  };

  const removeDigit = () => {
    onChange(value.slice(0, -1));
  };

  const clearPin = () => {
    onChange("");
  };

  return (
    <div className="space-y-3" id={id}>
      <div
        aria-label={`PIN, ${value.length} of ${PIN_LENGTH} digits entered`}
        aria-live="polite"
        className="flex h-12 items-center justify-center gap-2 rounded-lg border border-input bg-muted/40 px-4"
        role="status"
      >
        {value.length === 0 ? (
          <span className="text-sm text-muted-foreground">Enter your PIN</span>
        ) : (
          Array.from({ length: PIN_LENGTH }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                "size-2.5 rounded-full transition-colors",
                index < value.length ? "bg-foreground" : "bg-border"
              )}
            />
          ))
        )}
      </div>

      <div
        aria-label="PIN keypad"
        className="grid grid-cols-3 gap-2"
        role="group"
      >
        {KEYPAD_KEYS.map((digit) => (
          <Button
            key={digit}
            aria-label={`Digit ${digit}`}
            className="h-12 text-lg font-medium"
            disabled={disabled}
            onClick={() => appendDigit(digit)}
            type="button"
            variant="outline"
          >
            {digit}
          </Button>
        ))}

        <Button
          aria-label="Clear PIN"
          className="h-12 text-sm font-medium"
          disabled={disabled || value.length === 0}
          onClick={clearPin}
          type="button"
          variant="outline"
        >
          Clear
        </Button>

        <Button
          aria-label="Digit 0"
          className="h-12 text-lg font-medium"
          disabled={disabled}
          onClick={() => appendDigit("0")}
          type="button"
          variant="outline"
        >
          0
        </Button>

        <Button
          aria-label="Delete last digit"
          className="h-12"
          disabled={disabled || value.length === 0}
          onClick={removeDigit}
          type="button"
          variant="outline"
        >
          <IconBackspace aria-hidden="true" className="size-5" stroke={2.2} />
        </Button>
      </div>
    </div>
  );
}
