"use client";

import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { ApiError } from "@/lib/api/client";
import { isBackendConfigured } from "@/lib/files/api";
import {
  createPersonalFolder,
  deletePersonalFolder,
  fetchPersonalFolderTree,
  movePersonalFolder,
  renamePersonalFolder,
  upsertPersonalFolderItem,
  type PersonalFolder,
  type PersonalFolderId,
  type PersonalFolderItem,
} from "@/lib/personal-folders";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

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
    } catch (err) {
      toast.error({ title: "Couldn't load your folders", description: errorMessage(err, "Try refreshing.") });
    }
  }, [backendConfigured, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const startRenaming = useCallback((folderId: PersonalFolderId) => {
    setEditingFolderId(folderId);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingFolderId(null);
  }, []);

  const createFolder = useCallback(async () => {
    try {
      const folder = await createPersonalFolder("New folder", null);
      await refresh();
      setEditingFolderId(folder.id);
    } catch (err) {
      toast.error({ title: "Couldn't create folder", description: errorMessage(err, "Try again.") });
    }
  }, [refresh, toast]);

  const renameFolder = useCallback(
    async (folderId: PersonalFolderId, folderName: string) => {
      setEditingFolderId(null);
      const trimmed = folderName.trim();
      if (!trimmed) return;
      try {
        await renamePersonalFolder(folderId, trimmed);
        await refresh();
      } catch (err) {
        toast.error({ title: "Couldn't rename folder", description: errorMessage(err, "Try again.") });
      }
    },
    [refresh, toast],
  );

  const deleteFolder = useCallback(
    async (folderId: PersonalFolderId) => {
      try {
        await deletePersonalFolder(folderId);
        await refresh();
      } catch (err) {
        toast.error({ title: "Couldn't delete folder", description: errorMessage(err, "Try again.") });
      }
    },
    [refresh, toast],
  );

  const moveFile = useCallback(
    async (fileId: string, folderId: PersonalFolderId | null) => {
      const position = items.filter((item) => item.folderId === folderId && item.fileId !== fileId).length;
      try {
        await upsertPersonalFolderItem(fileId, folderId, position);
        await refresh();
        if (folderId) expandFolders([folderId]);
      } catch (err) {
        toast.error({ title: "Couldn't move file", description: errorMessage(err, "Try again.") });
      }
    },
    [items, refresh, expandFolders, toast],
  );

  const moveFolder = useCallback(
    async (folderId: PersonalFolderId, parentFolderId: PersonalFolderId | null) => {
      const position = folders.filter(
        (folder) => folder.parentFolderId === parentFolderId && folder.id !== folderId,
      ).length;
      try {
        await movePersonalFolder(folderId, parentFolderId, position);
        await refresh();
        if (parentFolderId) expandFolders([parentFolderId]);
      } catch (err) {
        toast.error({ title: "Couldn't move folder", description: errorMessage(err, "Try again.") });
      }
    },
    [folders, refresh, expandFolders, toast],
  );

  return {
    folders,
    items,
    expandedFolderIds,
    toggleExpand,
    expandFolders,
    collapseAll,
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
