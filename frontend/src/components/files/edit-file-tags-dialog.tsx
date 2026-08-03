"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { TruncatedFilename } from "@/components/preview-tabs/truncated-filename";
import { Button } from "@/components/ui/button";
import { ShellDialog } from "@/components/ui/shell-dialog";
import { TagInput } from "@/components/ui/tag-input";
import type { LibraryFile } from "@/lib/file-upload";
import { TRUNCATE_PROSE_CLASS } from "@/lib/ui/truncate";

type EditFileTagsDialogProps = {
  file: LibraryFile | null;
  files: LibraryFile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (fileId: string, tags: string[]) => void;
};

function collectLibraryTags(files: LibraryFile[]): string[] {
  const tags = new Set<string>();
  for (const entry of files) {
    for (const tag of entry.tags) {
      const normalized = tag.trim().toLowerCase();
      if (normalized) {
        tags.add(normalized);
      }
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

export function EditFileTagsDialog({
  file,
  files,
  open,
  onOpenChange,
  onSubmit,
}: EditFileTagsDialogProps) {
  const toast = useToast();
  const [tags, setTags] = useState<string[]>([]);

  const suggestions = useMemo(() => collectLibraryTags(files), [files]);
  const canSave = file != null && tags.length > 0;

  useEffect(() => {
    if (open && file) {
      setTags([...file.tags]);
    }
  }, [file, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTags([]);
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file || tags.length === 0) {
      return;
    }

    onSubmit(file.id, tags);
    toast.success({ title: "Tags saved" });
    handleOpenChange(false);
  };

  return (
    <ShellDialog
      bodyClassName="py-3"
      className="min-h-0"
      description={
        file ? (
          <span className="flex min-w-0 items-center gap-1">
            <span className="shrink-0">Keywords help Sage find</span>
            <TruncatedFilename
              className="font-medium text-foreground"
              maxWidthClass={TRUNCATE_PROSE_CLASS}
              title={file.file.name}
            />
          </span>
        ) : (
          "Keywords help Sage find this file."
        )
      }
      footer={
        <>
          <Button
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!canSave} type="submit">
            Save tags
          </Button>
        </>
      }
      kind="form"
      onOpenChange={handleOpenChange}
      onSafeExit={() => handleOpenChange(false)}
      onSubmit={handleSubmit}
      open={open && file != null}
      size="sm"
      title="Edit tags"
    >
      <TagInput
        id="file-tags-input"
        onChange={setTags}
        suggestions={suggestions}
        value={tags}
      />
    </ShellDialog>
  );
}
