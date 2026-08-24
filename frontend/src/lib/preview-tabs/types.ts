import type { SageFileType } from "@/lib/file-upload";

/** === fileId for MVP — the backend has no version/etag field, so a file
 * replace (PUT /files/{file_id}) keeps the same resourceKey. */
export type ResourceKey = string;

export type TabId = string;

export type OverflowMode = "pagination" | "scroll";

export type TabLifecycle = "loading" | "ready" | "error" | "removed";

/** Citation jump target for Phase 9 viewers (text scroll/highlight; PDF later). */
export type CitationHighlight = {
  citationId: string;
  charStart: number;
  charEnd: number;
};

export type ViewState = {
  zoom?: number;
  page?: number;
  scrollTop?: number;
  /** Set when opening from a Sources badge; viewers consume and may clear. */
  highlight?: CitationHighlight | null;
  /** PDF only: one page at a time vs all pages stacked. */
  scrollMode?: "single" | "continuous";
  /** Docx/md only. "rendered" (default) = formatted view (mammoth HTML for
   * docx, react-markdown for md). "raw" = plain extracted/source text — the
   * only mode that supports citation-highlight char offsets, so a citation
   * click forces this even if the tab was last left in "rendered". */
  sourceMode?: "raw" | "rendered";
};

export type PreviewTab = {
  tabId: TabId;
  resourceKey: ResourceKey;
  title: string;
  fileType: SageFileType;
  pinned: boolean;
  lifecycle: TabLifecycle;
  errorMessage?: string;
  viewState: ViewState;
};

export type PreviewTabsState = {
  tabs: PreviewTab[];
  activeTabId: TabId | null;
  overflowMode: OverflowMode;
  /** Most recently active/interacted-with first. */
  mruTabIds: TabId[];
};

/** Minimal descriptor openTab needs — decoupled from LibraryFile's full shape. */
export type OpenTabInput = {
  resourceKey: ResourceKey;
  title: string;
  fileType: SageFileType;
  /** Merged into the focused/new tab's viewState (e.g. citation highlight). */
  viewState?: Partial<ViewState>;
};
