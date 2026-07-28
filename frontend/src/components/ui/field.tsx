import { cn } from "@/lib/utils";

export const FIELD_SHELL =
  "border border-border bg-background shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50";

export const FIELD_INPUT =
  "min-w-0 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground";

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
        "flex min-w-0 items-center rounded-full py-1 pl-4 pr-4",
        FIELD_SHELL
      )}
    >
      <input
        className={cn(FIELD_INPUT, "flex-1 truncate")}
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
    <div className={cn("min-w-0 rounded-full px-4 py-2", FIELD_SHELL)}>
      <textarea
        className={cn(FIELD_INPUT, "min-h-24 resize-y")}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}
