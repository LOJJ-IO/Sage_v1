"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/use-theme";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { SettingsTextInput } from "@/components/settings/settings-fields";

type SettingsSection = "general" | "theme" | "account";

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
    <div className="grid gap-3 border-b border-border py-4 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:items-start sm:gap-6">
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
  const [section, setSection] = useState<SettingsSection>("general");
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const { theme, setTheme } = useTheme();

  const selectedTheme = THEME_OPTIONS.find((option) => option.id === theme)!;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex h-[min(80vh,32rem)] max-h-[min(80vh,32rem)] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Workspace and account settings
        </DialogDescription>

        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Settings sections"
            className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-border bg-muted/30 p-2"
          >
            <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Settings
            </p>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  section === item.id
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                )}
                onClick={() => setSection(item.id)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`codicon ${item.iconClass} [-webkit-text-stroke:0.35px_currentColor]`}
                  style={{ fontSize: 16 }}
                />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
            {section === "general" ? (
              <div>
                <h2 className="mb-1 font-heading text-lg font-semibold text-foreground">
                  General
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Profile and how Sage responds in chat.
                </p>

                <SettingsRow label="Display name">
                  <SettingsTextInput
                    onChange={setDisplayName}
                    placeholder="Your name"
                    value={displayName}
                  />
                </SettingsRow>

                <SettingsRow
                  description="What should Sage call you?"
                  label="Nickname"
                >
                  <SettingsTextInput
                    onChange={setNickname}
                    placeholder="e.g. Maria"
                    value={nickname}
                  />
                </SettingsRow>

                <SettingsRow label="Work description">
                  <SettingsTextInput
                    onChange={setWorkDescription}
                    placeholder="e.g. Floor associate"
                    value={workDescription}
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
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
