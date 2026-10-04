"use client";

import { useCallback, useMemo, useState } from "react";

import type { LibraryFile } from "@/lib/file-upload";

/** Upload order → A–Z → Z–A (the Sort button cycles); "type" is Auto-Sort. */
export type FileSortMode = "default" | "name-asc" | "name-desc" | "type";

const SORT_CYCLE: FileSortMode[] = ["default", "name-asc", "name-desc"];

export const FILE_SORT_LABELS: Record<FileSortMode, string> = {
  default: "Upload order",
  "name-asc": "Name A → Z",
  "name-desc": "Name Z → A",
  type: "Grouped by file type",
};

function compareNames(a: LibraryFile, b: LibraryFile) {
  return a.file.name.localeCompare(b.file.name, undefined, { sensitivity: "base" });
}

/** Client-side view over the library: search, bookmark filter, sort. Never mutates `files`. */
export function useFileView(files: LibraryFile[]) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<FileSortMode>("default");
  const [autoReveal, setAutoReveal] = useState(false);

  const visibleFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = files.filter((entry) => {
      if (bookmarkedOnly && !entry.isBookmarked) return false;
      if (!needle) return true;
      return (
        entry.file.name.toLowerCase().includes(needle) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });

    switch (sortMode) {
      case "name-asc":
        return [...filtered].sort(compareNames);
      case "name-desc":
        return [...filtered].sort((a, b) => compareNames(b, a));
      case "type":
        return [...filtered].sort(
          (a, b) => a.fileType.localeCompare(b.fileType) || compareNames(a, b),
        );
      default:
        return filtered;
    }
  }, [bookmarkedOnly, files, query, sortMode]);

  /** Advances the Sort cycle and returns the new mode (for a toast). */
  const cycleSort = useCallback((): FileSortMode => {
    const index = SORT_CYCLE.indexOf(sortMode);
    const next = SORT_CYCLE[(index + 1) % SORT_CYCLE.length];
    setSortMode(next);
    return next;
  }, [sortMode]);

  /** Toggles Auto-Sort (group by type); returns whether it is now on. */
  const toggleAutoSort = useCallback((): boolean => {
    const next = sortMode !== "type";
    setSortMode(next ? "type" : "default");
    return next;
  }, [sortMode]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      if (open) setQuery("");
      return !open;
    });
  }, []);

  /** "Files": back to the plain, unfiltered library. */
  const showAllFiles = useCallback(() => {
    setQuery("");
    setSearchOpen(false);
    setBookmarkedOnly(false);
  }, []);

  return {
    visibleFiles,
    query,
    setQuery,
    searchOpen,
    toggleSearch,
    bookmarkedOnly,
    toggleBookmarkedOnly: () => setBookmarkedOnly((on) => !on),
    sortMode,
    cycleSort,
    toggleAutoSort,
    autoReveal,
    toggleAutoReveal: () => setAutoReveal((on) => !on),
    showAllFiles,
    isFiltered: bookmarkedOnly || query.trim().length > 0,
  };
}
