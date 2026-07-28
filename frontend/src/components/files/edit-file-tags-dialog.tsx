"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LibraryFile } from "@/lib/file-upload";

type EditFileTagsDialogProps = {
  file: LibraryFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (fileId: string, tags: string[]) => void;
};

function parseTagsInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    ),
  ];
}

function formatTagsInput(tags: string[]): string {
  return tags.join(", ");
}

export function EditFileTagsDialog({
  file,
  open,
  onOpenChange,
  onSubmit,
}: EditFileTagsDialogProps) {
  const toast = useToast();
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (open && file) {
      setTagsInput(formatTagsInput(file.tags));
    }
  }, [file, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTagsInput("");
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      return;
    }

    onSubmit(file.id, parseTagsInput(tagsInput));
    toast.success({ title: "Tags saved" });
    handleOpenChange(false);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      {open && file ? (
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit tags</DialogTitle>
              <DialogDescription>
                Keywords help Sage find{" "}
                <span className="font-medium text-foreground">
                  {file.file.name}
                </span>{" "}
                when staff ask questions. Separate tags with commas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="file-tags-input">Tags / keywords</Label>
              <Input
                autoComplete="off"
                id="file-tags-input"
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="training, policy, returns"
                value={tagsInput}
              />
            </div>

            <DialogFooter>
              <Button
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button type="submit">Save tags</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
