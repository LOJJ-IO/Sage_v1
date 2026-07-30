/**
 * Truncation principles (Material / HIG / desktop shells):
 * - Ellipsis on overflow; never wrap long labels in chrome.
 * - Measure in `ch` (font-relative), not fixed px.
 * - Cap chips vs the field so siblings + caret stay visible (`%` of container).
 * - Always pair with tooltip / `title` when the full string matters.
 */

/** Max width for dialog titles / filenames in descriptions. */
export const TRUNCATE_PROSE_MAX_CLASS = "max-w-[min(100%,28ch)]";

/** Dialog titles, filenames in descriptions, prose labels. */
export const TRUNCATE_PROSE_CLASS = `min-w-0 ${TRUNCATE_PROSE_MAX_CLASS} truncate`;

/**
 * Max width for chips / tags inside a field: at most ~2/3 of the field or ~24ch,
 * whichever is smaller — leaves room to scan other chips and type.
 */
export const TRUNCATE_CHIP_MAX_CLASS = "max-w-[min(70%,24ch)]";

/** Chip label text (apply max on the chip shell, truncate on the label). */
export const TRUNCATE_CHIP_CLASS = `min-w-0 ${TRUNCATE_CHIP_MAX_CLASS} truncate`;

/** Full-width rows (suggestion lists): fill parent, ellipsis at the end. */
export const TRUNCATE_ROW_CLASS = "min-w-0 w-full truncate";
