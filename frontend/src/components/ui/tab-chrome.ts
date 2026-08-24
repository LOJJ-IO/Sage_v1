/** Shared by every tab strip (preview, chat) — the fixed width every tab sits
 * at (`shrink-0`, never compressed below this). Once tabs overflow the
 * strip's width they scroll (`PANEL_HEADER_TABLIST_CLASS`'s `overflow-x-auto`
 * in `panel-header.ts`), rather than shrinking to fit. */
export const TAB_MAX_WIDTH_PX = 160;
