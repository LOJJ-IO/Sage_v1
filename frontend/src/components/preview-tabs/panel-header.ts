/** Must match side-panel headers in `page.tsx` (`h-14` + `border-b`). */
export const PANEL_HEADER_ROW_CLASS =
  "flex h-14 w-full shrink-0 rounded-t-2xl border-b border-border bg-background";

/** Tab strip with open tabs — recessed well; active tab bridges into the stage below. */
export const PANEL_HEADER_ROW_WITH_TABS_CLASS =
  "preview-tab-strip flex h-14 w-full shrink-0 overflow-visible rounded-t-2xl";

/** Tab gutter — left panel corner. */
export const PANEL_HEADER_TABLIST_CLASS =
  "flex min-w-0 flex-1 items-stretch overflow-visible rounded-tl-2xl pl-1.5";

/** Strip settings — always uses active-tab chrome at the panel's right edge. */
export const PANEL_HEADER_SETTINGS_CLASS =
  "preview-tab-shaped preview-tab--no-right-fillet preview-tab-settings flex shrink-0 items-center self-stretch px-2";
