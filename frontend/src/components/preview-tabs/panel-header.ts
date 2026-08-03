/** Must match side-panel headers in `page.tsx` (`h-14` + `border-b`). */
export const PANEL_HEADER_ROW_CLASS =
  "flex h-14 w-full shrink-0 rounded-t-2xl border-b border-border bg-background";

/** Tab strip with open tabs — recessed well; border kept so inactive tabs
 * still sit on a separator; active chrome paints over it (see CSS). */
export const PANEL_HEADER_ROW_WITH_TABS_CLASS =
  "preview-tab-strip flex h-14 w-full shrink-0 overflow-visible rounded-t-2xl border-b border-border";

/** Tab gutter — left panel corner. */
export const PANEL_HEADER_TABLIST_CLASS =
  "flex min-w-0 flex-1 items-stretch overflow-x-hidden overflow-y-visible rounded-tl-2xl pl-2.5";

/** Strip settings — same short chrome as active tabs (height/align from CSS). */
export const PANEL_HEADER_SETTINGS_CLASS =
  "preview-tab-shaped preview-tab-settings flex shrink-0 items-center px-2";
