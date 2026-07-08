"use client";

import { PIN_LENGTH } from "@/lib/auth/types";
import { Input } from "@/components/ui/input";

type PinInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoComplete?: string;
};

export function PinInput({
  id,
  value,
  onChange,
  disabled = false,
  autoComplete = "off",
}: PinInputProps) {
  return (
    <Input
      autoComplete={autoComplete}
      disabled={disabled}
      id={id}
      inputMode="numeric"
      maxLength={PIN_LENGTH}
      onChange={(event) => {
        onChange(
          event.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH)
        );
      }}
      pattern="[0-9]*"
      placeholder="4-digit PIN"
      type="password"
      value={value}
    />
  );
}
