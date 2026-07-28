"use client";

import { useCallback, useMemo } from "react";

import { FieldTextArea } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  DialogSection,
  DialogSectionGroup,
} from "@/components/ui/dialog-section";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  useDialogDraft,
  useDialogOpenSync,
} from "@/hooks/use-dialog-draft";
import { useToast } from "@/components/providers/toast-provider";

type ConversationalGoal = "default" | "learning" | "custom";
type ResponseLength = "default" | "shorter";

type ConfigureChatDraft = {
  goal: ConversationalGoal;
  responseLength: ResponseLength;
  customInstructions: string;
};

const INITIAL_DRAFT: ConfigureChatDraft = {
  goal: "default",
  responseLength: "default",
  customInstructions: "",
};

const GOAL_OPTIONS = [
  { value: "default" as const, label: "Default" },
  { value: "learning" as const, label: "Learning guide" },
  { value: "custom" as const, label: "Custom" },
];

const LENGTH_OPTIONS = [
  { value: "default" as const, label: "Default" },
  { value: "shorter" as const, label: "Shorter" },
];

const GOAL_DESCRIPTIONS: Record<ConversationalGoal, string> = {
  default: "Best for general purpose research and brainstorming tasks.",
  learning: "Guides you step-by-step and explains concepts as you go.",
  custom: "Define your own conversational style or role.",
};

const LENGTH_DESCRIPTIONS: Record<ResponseLength, string> = {
  default: "Balanced detail for most store questions.",
  shorter: "Brief, direct answers when you need a quick reply.",
};

type ConfigureChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConfigureChatDialog({
  open,
  onOpenChange,
}: ConfigureChatDialogProps) {
  const toast = useToast();
  const { draft, setDraft, resetDraft, syncOnOpen, isSaving, save } =
    useDialogDraft(INITIAL_DRAFT);

  useDialogOpenSync(open, syncOnOpen);

  const handleSave = useCallback(async () => {
    await save(async () => {
      // Local-only until chat config API exists.
    });
    toast.success({ title: "Chat settings saved" });
  }, [save, toast]);

  const setGoal = useCallback(
    (goal: ConversationalGoal) => {
      setDraft((current) => ({ ...current, goal }));
    },
    [setDraft]
  );

  const setResponseLength = useCallback(
    (responseLength: ResponseLength) => {
      setDraft((current) => ({ ...current, responseLength }));
    },
    [setDraft]
  );

  const setCustomInstructions = useCallback(
    (customInstructions: string) => {
      setDraft((current) => ({ ...current, customInstructions }));
    },
    [setDraft]
  );

  const goalDescription = useMemo(
    () => GOAL_DESCRIPTIONS[draft.goal],
    [draft.goal]
  );

  const lengthDescription = useMemo(
    () => LENGTH_DESCRIPTIONS[draft.responseLength],
    [draft.responseLength]
  );

  return (
    <FormDialog
      description="Customize your assistance"
      isSaving={isSaving}
      onDiscard={resetDraft}
      onOpenChange={onOpenChange}
      onSave={handleSave}
      open={open}
      title="Configure chat"
    >
      <div className="space-y-6">
        <DialogSection title="Define your conversational goal, style or role">
          <DialogSectionGroup>
            <SegmentedControl
              aria-label="Conversational goal"
              onChange={setGoal}
              options={GOAL_OPTIONS}
              value={draft.goal}
            />
            {draft.goal === "custom" ? (
              <FieldTextArea
                onChange={setCustomInstructions}
                placeholder="e.g. act as a patient trainer for new floor associates"
                value={draft.customInstructions}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{goalDescription}</p>
            )}
          </DialogSectionGroup>
        </DialogSection>

        <DialogSection title="Choose your response length">
          <DialogSectionGroup>
            <SegmentedControl
              aria-label="Response length"
              onChange={setResponseLength}
              options={LENGTH_OPTIONS}
              value={draft.responseLength}
            />
            <p className="text-sm text-muted-foreground">{lengthDescription}</p>
          </DialogSectionGroup>
        </DialogSection>
      </div>
    </FormDialog>
  );
}
