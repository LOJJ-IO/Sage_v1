import { cn } from "@/lib/utils";

export const ASK_PANE_FIELD_SHELL =
  "border border-border bg-background shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50";

export const ASK_PANE_FIELD_INPUT =
  "min-w-0 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground";

export function SettingsTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center rounded-full py-1 pl-4 pr-4",
        ASK_PANE_FIELD_SHELL
      )}
    >
      <input
        className={cn(ASK_PANE_FIELD_INPUT, "flex-1 truncate")}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </div>
  );
}

export function SettingsTextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      className={cn("min-w-0 rounded-2xl px-4 py-2", ASK_PANE_FIELD_SHELL)}
    >
      <textarea
        className={cn(ASK_PANE_FIELD_INPUT, "min-h-24 resize-y")}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}
