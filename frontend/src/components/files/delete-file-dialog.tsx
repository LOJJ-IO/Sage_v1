"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/providers/toast-provider";
import type { LibraryFile } from "@/lib/file-upload";

type DeleteFileDialogProps = {
  file: LibraryFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fileId: string) => void;
};

export function DeleteFileDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
}: DeleteFileDialogProps) {
  const toast = useToast();

  if (!open || !file) {
    return null;
  }

  return (
    <ConfirmDialog
      confirmLabel="Delete"
      description={
        <>
          <span className="font-medium text-foreground">
            {file.file.name}
          </span>{" "}
          will be removed for everyone, including bookmarks and personal folder
          placements. This cannot be undone.
        </>
      }
      onConfirm={() => {
        onConfirm(file.id);
        toast.success({ title: "File deleted" });
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Delete file"
    />
  );
}
