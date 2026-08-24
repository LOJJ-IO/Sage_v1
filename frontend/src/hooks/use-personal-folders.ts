"use client";

import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { isBackendConfigured } from "@/lib/files/api";
import {
  createPersonalFolder,
  deletePersonalFolder,
  fetchPersonalFolderTree,
  getDescendantFolderIds,
  movePersonalFolder,
  renamePersonalFolder,
  upsertPersonalFolderItem,
  type PersonalFolder,
  type PersonalFolderId,
  type PersonalFolderItem,
} from "@/lib/personal-folders";

/** Every mutation below applies the change to local state immediately (using
 * the mutation's own response, or an optimistic guess rolled back on error)
 * instead of awaiting a follow-up `refresh()` — a second network round trip
 * on every click was the actual cause of "creating/renaming/dragging feels
 * slow with no feedback" (the UI was correctly waiting for confirmation, it
 * just had two round trips to wait through instead of one). One known,
 * accepted trade-off: a move/delete renumbers OTHER sibling positions on the
 * server too; this file only patches the folder/item actually acted on, so
 * untouched siblings' `position` can go briefly stale until the next natural
 * refetch (mount, or the initial load) — self-heals, never visibly wrong
 * (`buildFolderTree`/`getFolderChildFileIds` still sort correctly for
 * anything not mid-drift). */
export function usePersonalFolders() {
  const toast = useToast();
  const backendConfigured = isBackendConfigured();
  const [folders, setFolders] = useState<PersonalFolder[]>([]);
  const [items, setItems] = useState<PersonalFolderItem[]>([]);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<PersonalFolderId>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<PersonalFolderId | null>(null);

  const refresh = useCallback(async () => {
    if (!backendConfigured) return;
    try {
      const tree = await fetchPersonalFolderTree();
      setFolders(tree.folders);
      setItems(tree.items);
    } catch {
      toast.error({ title: "Couldn't load your folders", description: "Try refreshing." });
    }
  }, [backendConfigured, toast]);

  useEffect(() => {
    void refresh();
    // Only ever needed once, on mount — every mutation below keeps local
    // state in sync itself. Re-running this on every `refresh` identity
    // change would re-fetch on every render since `refresh` closes over
    // `toast`; intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpand = useCallback((folderId: PersonalFolderId) => {
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const expandFolders = useCallback((folderIds: PersonalFolderId[]) => {
    if (folderIds.length === 0) return;
    setExpandedFolderIds((current) => {
      if (folderIds.every((id) => current.has(id))) return current;
      return new Set([...current, ...folderIds]);
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedFolderIds(new Set());
  }, []);

  const expandAll = useCallback(() => {
    setExpandedFolderIds(new Set(folders.map((f) => f.id)));
  }, [folders]);

  const startRenaming = useCallback((folderId: PersonalFolderId) => {
    setEditingFolderId(folderId);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingFolderId(null);
  }, []);

  const createFolder = useCallback(async () => {
    // No optimistic-before-request step here: the server assigns the real
    // id, and this is already down to a single request (the old code also
    // awaited a full refetch afterward) — that alone removes the extra
    // round trip that made this feel slow.
    try {
      const folder = await createPersonalFolder("New folder", null);
      setFolders((current) => [...current, folder]);
      setEditingFolderId(folder.id);
    } catch {
      toast.error({ title: "Couldn't create the folder", description: "Try again." });
    }
  }, [toast]);

  const renameFolder = useCallback(
    async (folderId: PersonalFolderId, folderName: string) => {
      setEditingFolderId(null);
      const trimmed = folderName.trim();
      if (!trimmed) return;

      const original = folders.find((f) => f.id === folderId)?.folderName;
      setFolders((current) => current.map((f) => (f.id === folderId ? { ...f, folderName: trimmed } : f)));

      try {
        const renamed = await renamePersonalFolder(folderId, trimmed);
        setFolders((current) => current.map((f) => (f.id === folderId ? renamed : f)));
      } catch {
        if (original !== undefined) {
          setFolders((current) => current.map((f) => (f.id === folderId ? { ...f, folderName: original } : f)));
        }
        toast.error({ title: "Couldn't rename the folder", description: "Try again." });
      }
    },
    [folders, toast],
  );

  const deleteFolder = useCallback(
    async (folderId: PersonalFolderId) => {
      const idsToRemove = new Set([folderId, ...getDescendantFolderIds(folders, folderId)]);
      const removedFolders = folders.filter((f) => idsToRemove.has(f.id));
      const previousItems = items.filter((i) => i.folderId !== null && idsToRemove.has(i.folderId));

      setFolders((current) => current.filter((f) => !idsToRemove.has(f.id)));
      setItems((current) =>
        current.map((i) => (i.folderId !== null && idsToRemove.has(i.folderId) ? { ...i, folderId: null } : i)),
      );

      try {
        await deletePersonalFolder(folderId);
      } catch {
        setFolders((current) => [...current, ...removedFolders]);
        setItems((current) =>
          current.map((i) => previousItems.find((p) => p.fileId === i.fileId) ?? i),
        );
        toast.error({ title: "Couldn't delete the folder", description: "Try again." });
      }
    },
    [folders, items, toast],
  );

  const moveFile = useCallback(
    async (fileId: string, folderId: PersonalFolderId | null) => {
      const previous = items.find((i) => i.fileId === fileId) ?? null;
      const position = items.filter((item) => item.folderId === folderId && item.fileId !== fileId).length;

      setItems((current) => [...current.filter((i) => i.fileId !== fileId), { fileId, folderId, position }]);
      if (folderId) expandFolders([folderId]);

      try {
        const saved = await upsertPersonalFolderItem(fileId, folderId, position);
        setItems((current) => current.map((i) => (i.fileId === fileId ? saved : i)));
      } catch {
        setItems((current) => {
          const withoutFile = current.filter((i) => i.fileId !== fileId);
          return previous ? [...withoutFile, previous] : withoutFile;
        });
        toast.error({ title: "Couldn't move the file", description: "Try again." });
      }
    },
    [items, expandFolders, toast],
  );

  const moveFolder = useCallback(
    async (folderId: PersonalFolderId, parentFolderId: PersonalFolderId | null) => {
      const previous = folders.find((f) => f.id === folderId);
      if (!previous) return;
      const position = folders.filter(
        (folder) => folder.parentFolderId === parentFolderId && folder.id !== folderId,
      ).length;

      setFolders((current) => current.map((f) => (f.id === folderId ? { ...f, parentFolderId, position } : f)));
      if (parentFolderId) expandFolders([parentFolderId]);

      try {
        const moved = await movePersonalFolder(folderId, parentFolderId, position);
        setFolders((current) => current.map((f) => (f.id === folderId ? moved : f)));
      } catch {
        setFolders((current) => current.map((f) => (f.id === folderId ? previous : f)));
        toast.error({ title: "Couldn't move the folder", description: "Try again." });
      }
    },
    [folders, expandFolders, toast],
  );

  return {
    folders,
    items,
    expandedFolderIds,
    toggleExpand,
    expandFolders,
    collapseAll,
    expandAll,
    editingFolderId,
    startRenaming,
    cancelEditing,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFile,
    moveFolder,
  };
}

export type PersonalFoldersController = ReturnType<typeof usePersonalFolders>;
