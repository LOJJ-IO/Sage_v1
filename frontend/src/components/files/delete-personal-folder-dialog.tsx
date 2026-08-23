"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/providers/toast-provider";
import type { PersonalFolder } from "@/lib/personal-folders";

type DeletePersonalFolderDialogProps = {
  folder: PersonalFolder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folderId: string) => void;
};

export function DeletePersonalFolderDialog({
  folder,
  open,
  onOpenChange,
  onConfirm,
}: DeletePersonalFolderDialogProps) {
  const toast = useToast();

  if (!open || !folder) {
    return null;
  }

  return (
    <ConfirmDialog
      confirmLabel="Delete"
      description={
        <>
          <span className="font-medium text-foreground">
            {folder.folderName}
          </span>{" "}
          and its subfolders will be removed from your personal file tree.
          Files inside move back to the top level — nothing is deleted from
          the shared knowledge base. This cannot be undone.
        </>
      }
      onConfirm={() => {
        onConfirm(folder.id);
        toast.success({ title: "Folder deleted" });
      }}
      onOpenChange={onOpenChange}
      open={open}
      title="Delete folder"
    />
  );
}
