"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsTextArea } from "@/components/settings/settings-fields";

type ConversationalGoal = "default" | "learning" | "custom";
type ResponseLength = "default" | "shorter";

const GOAL_OPTIONS: {
  id: ConversationalGoal;
  label: string;
  description: string;
}[] = [
  {
    id: "default",
    label: "Default",
    description:
      "Best for general purpose research and brainstorming tasks.",
  },
  {
    id: "learning",
    label: "Learning guide",
    description:
      "Guides you step-by-step and explains concepts as you go.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Define your own conversational style or role.",
  },
];

const LENGTH_OPTIONS: {
  id: ResponseLength;
  label: string;
  description: string;
}[] = [
  {
    id: "default",
    label: "Default",
    description: "Balanced detail for most store questions.",
  },
  {
    id: "shorter",
    label: "Shorter",
    description: "Brief, direct answers when you need a quick reply.",
  },
];

type ConfigureChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ConfigPill({
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

export function ConfigureChatDialog({
  open,
  onOpenChange,
}: ConfigureChatDialogProps) {
  const [goal, setGoal] = useState<ConversationalGoal>("default");
  const [responseLength, setResponseLength] = useState<ResponseLength>("default");
  const [customInstructions, setCustomInstructions] = useState("");

  const selectedGoal = GOAL_OPTIONS.find((option) => option.id === goal)!;
  const selectedLength = LENGTH_OPTIONS.find(
    (option) => option.id === responseLength
  )!;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure chat</DialogTitle>
          <DialogDescription>Customise your Assistance</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              Define your conversational goal, style or role
            </h3>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((option) => (
                <ConfigPill
                  key={option.id}
                  onClick={() => setGoal(option.id)}
                  selected={goal === option.id}
                >
                  {option.label}
                </ConfigPill>
              ))}
            </div>
            {goal === "custom" ? (
              <SettingsTextArea
                onChange={setCustomInstructions}
                placeholder="e.g. act as a patient trainer for new floor associates"
                value={customInstructions}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedGoal.description}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              Choose your response length
            </h3>
            <div className="flex flex-wrap gap-2">
              {LENGTH_OPTIONS.map((option) => (
                <ConfigPill
                  key={option.id}
                  onClick={() => setResponseLength(option.id)}
                  selected={responseLength === option.id}
                >
                  {option.label}
                </ConfigPill>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedLength.description}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
