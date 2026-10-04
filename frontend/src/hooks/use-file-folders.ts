"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isDemoRoute } from "@/lib/demo/mode";

/**
 * Client-side folders for the file library. The backend has no folder model
 * yet, so on `/` this is saved per browser (localStorage); on `/demo` it is
 * seeded from the demo data and resets on reload like the rest of the demo.
 */

export type FileFolder = { id: string; name: string };

type FolderState = {
  folders: FileFolder[];
  /** file id → folder id; files not listed sit at the root. */
  assignments: Record<string, string>;
  collapsed: string[];
};

const STORAGE_KEY = "sage_file_folders";
const EMPTY: FolderState = { folders: [], assignments: {}, collapsed: [] };

function newFolderId() {
  return `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function loadInitialState(): Promise<FolderState> {
  if (isDemoRoute()) {
    const { DEMO_DOCUMENTS, DEMO_FOLDERS } = await import("@/lib/demo/seed");
    const folders = DEMO_FOLDERS.map((name) => ({ id: `demo-folder-${name.toLowerCase()}`, name }));
    const idByName = new Map(folders.map((f) => [f.name, f.id]));
    const assignments: Record<string, string> = {};
    for (const doc of DEMO_DOCUMENTS) {
      const folderId = doc.folder ? idByName.get(doc.folder) : undefined;
      if (folderId) assignments[doc.file_id] = folderId;
    }
    return { folders, assignments, collapsed: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<FolderState>;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      assignments: parsed.assignments ?? {},
      collapsed: Array.isArray(parsed.collapsed) ? parsed.collapsed : [],
    };
  } catch {
    return EMPTY;
  }
}

export function useFileFolders() {
  const [state, setState] = useState<FolderState>(EMPTY);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadInitialState().then((initial) => {
      if (cancelled) return;
      loadedRef.current = true;
      setState(initial);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current || isDemoRoute()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private mode / quota — folders still work for this session.
    }
  }, [state]);

  /** Adds "New folder" and puts it straight into rename mode. */
  const createFolder = useCallback(() => {
    const id = newFolderId();
    setState((s) => {
      const taken = new Set(s.folders.map((f) => f.name));
      let name = "New folder";
      for (let n = 2; taken.has(name); n += 1) name = `New folder ${n}`;
      return { ...s, folders: [...s.folders, { id, name }] };
    });
    setEditingFolderId(id);
    return id;
  }, []);

  const renameFolder = useCallback((folderId: string, name: string) => {
    const trimmed = name.trim();
    setEditingFolderId(null);
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      folders: s.folders.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f)),
    }));
  }, []);

  /** Removes the folder; its files move back to the root (never deleted). */
  const deleteFolder = useCallback((folderId: string) => {
    setState((s) => ({
      folders: s.folders.filter((f) => f.id !== folderId),
      assignments: Object.fromEntries(
        Object.entries(s.assignments).filter(([, id]) => id !== folderId),
      ),
      collapsed: s.collapsed.filter((id) => id !== folderId),
    }));
  }, []);

  /** `folderId: null` moves the file back to the root. */
  const moveFile = useCallback((fileId: string, folderId: string | null) => {
    setState((s) => {
      const assignments = { ...s.assignments };
      if (folderId) assignments[fileId] = folderId;
      else delete assignments[fileId];
      return {
        ...s,
        assignments,
        // Show the file where it landed.
        collapsed: folderId ? s.collapsed.filter((id) => id !== folderId) : s.collapsed,
      };
    });
  }, []);

  const toggleCollapsed = useCallback((folderId: string) => {
    setState((s) => ({
      ...s,
      collapsed: s.collapsed.includes(folderId)
        ? s.collapsed.filter((id) => id !== folderId)
        : [...s.collapsed, folderId],
    }));
  }, []);

  const collapseAll = useCallback(() => {
    setState((s) => ({ ...s, collapsed: s.folders.map((f) => f.id) }));
  }, []);

  return {
    folders: state.folders,
    assignments: state.assignments,
    collapsed: state.collapsed,
    editingFolderId,
    setEditingFolderId,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFile,
    toggleCollapsed,
    collapseAll,
  };
}

export type FileFoldersApi = ReturnType<typeof useFileFolders>;
