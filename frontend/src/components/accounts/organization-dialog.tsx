"use client";

import { OrganizationView } from "@/components/accounts/organization-view";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OrganizationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OrganizationDialog({
  open,
  onOpenChange,
}: OrganizationDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="max-h-[min(85vh,42rem)] max-w-4xl"
        kind="confirm"
        size="xl"
        variant="shell"
      >
        <DialogHeader>
          <DialogTitle>Organization</DialogTitle>
          <DialogDescription>
            Create accounts, reset PINs, and deactivate staff access.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-4 py-4">
          <OrganizationView active={open} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
