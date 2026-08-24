/** Shared by every panel with a tab strip (preview, chat) so all three panel
 * headers (including the plain file-panel header in `page.tsx`) sit at the
 * exact same height/position — "always exactly one h-14 row, never a
 * conditionally-added second row" is what keeps tab strips vertically
 * aligned across panels regardless of how many tabs/sessions are open. */
export const PANEL_HEADER_ROW_CLASS =
  "flex h-14 w-full shrink-0 rounded-t-2xl border-b border-border bg-background";

/** Tab strip with open tabs — recessed well; border kept so inactive tabs
 * still sit on a separator; active chrome paints over it (see preview-tab-chrome.css). */
export const PANEL_HEADER_ROW_WITH_TABS_CLASS =
  "preview-tab-strip flex h-14 w-full shrink-0 overflow-visible rounded-t-2xl border-b border-border";

/** Tab gutter — left panel corner. `overflow-x-auto` (not `-hidden`): tabs no
 * longer compress to fit, they scroll once they overflow. */
export const PANEL_HEADER_TABLIST_CLASS =
  "scrollbar-thin flex min-w-0 flex-1 items-stretch overflow-x-auto overflow-y-visible rounded-tl-2xl pl-2.5";

/** Strip settings — same short chrome as active tabs (height/align from CSS). */
export const PANEL_HEADER_SETTINGS_CLASS =
  "preview-tab-shaped preview-tab-settings flex shrink-0 items-center px-2";
