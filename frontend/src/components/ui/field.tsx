import { cn } from "@/lib/utils";
import { INPUT_CONTROL, INPUT_SHELL } from "@/components/ui/input";

/** @deprecated Prefer `INPUT_SHELL` from `@/components/ui/input`. */
export const FIELD_SHELL = INPUT_SHELL;

/** @deprecated Prefer `INPUT_CONTROL` from `@/components/ui/input`. */
export const FIELD_INPUT = INPUT_CONTROL;

type FieldInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  type?: "text" | "email" | "password";
};

export function FieldInput({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  type = "text",
}: FieldInputProps) {
  return (
    <div
      className={cn(
        "flex h-10 min-w-0 items-center px-3.5",
        INPUT_SHELL
      )}
    >
      <input
        className={cn(INPUT_CONTROL, "w-full flex-1 truncate")}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </div>
  );
}

type FieldTextAreaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
};

export function FieldTextArea({
  value,
  onChange,
  placeholder,
  id,
  disabled,
}: FieldTextAreaProps) {
  return (
    <div className={cn("min-w-0 px-3.5 py-2.5", INPUT_SHELL)}>
      <textarea
        className={cn(INPUT_CONTROL, "min-h-24 w-full resize-y")}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}
