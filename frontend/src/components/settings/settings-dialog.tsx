"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useDialogDraft,
  useDialogOpenSync,
} from "@/hooks/use-dialog-draft";
import { useToast } from "@/components/providers/toast-provider";
import { useTheme } from "@/hooks/use-theme";
import { signOut } from "@/lib/auth/session";
import type { ThemePreference } from "@/lib/theme";

type SettingsSection = "general" | "theme" | "account";

type SettingsDraft = {
  displayName: string;
  nickname: string;
  workDescription: string;
};

const INITIAL_DRAFT: SettingsDraft = {
  displayName: "",
  nickname: "",
  workDescription: "",
};

const NAV_ITEMS: {
  id: SettingsSection;
  label: string;
  iconClass: string;
}[] = [
  { id: "general", label: "General", iconClass: "codicon-settings-gear" },
  { id: "theme", label: "Theme", iconClass: "codicon-color-mode" },
  { id: "account", label: "Account", iconClass: "codicon-account" },
];

const THEME_OPTIONS: {
  id: ThemePreference;
  label: string;
  description: string;
}[] = [
  {
    id: "light",
    label: "Light",
    description: "Always use the light appearance.",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Always use the dark appearance.",
  },
  {
    id: "system",
    label: "System",
    description: "Match your device's light or dark setting.",
  },
];

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:items-start sm:gap-6">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ThemePill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      onClick={onClick}
      size="sm"
      type="button"
      variant={selected ? "default" : "ghost"}
    >
      {children}
    </Button>
  );
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const router = useRouter();
  const [section, setSection] = useState<SettingsSection>("general");
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const { draft, setDraft, resetDraft, syncOnOpen, isSaving, save } =
    useDialogDraft(INITIAL_DRAFT);

  useDialogOpenSync(open, syncOnOpen);

  const selectedTheme = THEME_OPTIONS.find((option) => option.id === theme)!;

  const handleSignOut = useCallback(() => {
    signOut();
    onOpenChange(false);
    router.replace("/sign-in");
  }, [onOpenChange, router]);

  const handleSave = useCallback(async () => {
    await save(async () => {
      // Local-only until profile API exists.
    });
    toast.success({ title: "Settings saved" });
  }, [save, toast]);

  const updateDraft = useCallback(
    <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    [setDraft]
  );

  return (
    <FormDialog
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30 p-2"
      description="Workspace and account settings"
      isSaving={isSaving}
      onDiscard={resetDraft}
      onOpenChange={onOpenChange}
      onSave={handleSave}
      open={open}
      size="lg"
      title="Settings"
    >
      <div className="flex min-h-0 flex-1 gap-2">
        <nav
          aria-label="Settings sections"
          className="flex w-30 shrink-0 flex-col gap-0.5 rounded-2xl border border-border bg-background p-2 shadow-sm"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              aria-current={section === item.id ? "page" : undefined}
              className={cn(
                "flex items-center justify-center rounded-md px-2 py-2 text-sm transition-colors",
                section === item.id
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
              onClick={() => setSection(item.id)}
              type="button"
            >
              <span className="grid w-24 grid-cols-[1rem_1fr] items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`codicon ${item.iconClass} justify-self-center [-webkit-text-stroke:0.35px_currentColor]`}
                  style={{ fontSize: 16 }}
                />
                <span className="text-left">{item.label}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-background px-6 py-5 shadow-sm">
          {section === "general" ? (
            <div>
              <h2 className="mb-1 font-heading text-lg font-semibold text-foreground">
                General
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Profile and how Sage responds in chat.
              </p>

              <SettingsRow label="Display name">
                <FieldInput
                  onChange={(value) => updateDraft("displayName", value)}
                  placeholder="Your name"
                  value={draft.displayName}
                />
              </SettingsRow>

              <SettingsRow
                description="What should Sage call you?"
                label="Nickname"
              >
                <FieldInput
                  onChange={(value) => updateDraft("nickname", value)}
                  placeholder="e.g. Maria"
                  value={draft.nickname}
                />
              </SettingsRow>

              <SettingsRow label="Work description">
                <FieldInput
                  onChange={(value) => updateDraft("workDescription", value)}
                  placeholder="e.g. Floor associate"
                  value={draft.workDescription}
                />
              </SettingsRow>
            </div>
          ) : section === "theme" ? (
            <div>
              <h2 className="mb-1 font-heading text-lg font-semibold text-foreground">
                Theme
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Choose how Sage looks on this device.
              </p>

              <SettingsRow
                description="Applies immediately and is remembered locally."
                label="Appearance"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {THEME_OPTIONS.map((option) => (
                      <ThemePill
                        key={option.id}
                        onClick={() => setTheme(option.id)}
                        selected={theme === option.id}
                      >
                        {option.label}
                      </ThemePill>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedTheme.description}
                  </p>
                </div>
              </SettingsRow>
            </div>
          ) : (
            <div>
              <h2 className="mb-1 font-heading text-lg font-semibold text-foreground">
                Account
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Security and help for your account.
              </p>

              <SettingsRow label="PIN">
                <div className="space-y-2">
                  <Button disabled size="sm" type="button" variant="outline">
                    Reset PIN
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Change-PIN flow coming soon.
                  </p>
                </div>
              </SettingsRow>

              <SettingsRow label="Help">
                <a
                  className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  href="https://sage.app"
                  rel="noreferrer"
                  target="_blank"
                >
                  Learn more about Sage
                </a>
              </SettingsRow>

              <SettingsRow
                description="End your session on this device."
                label="Sign out"
              >
                <Button onClick={handleSignOut} size="sm" type="button" variant="outline">
                  Sign out
                </Button>
              </SettingsRow>
            </div>
          )}
        </div>
      </div>
    </FormDialog>
  );
}
