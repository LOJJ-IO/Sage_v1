"use client";

import { useEffect, useRef, useState } from "react";

export type TabCompression = "normal" | "compact" | "icon-only";

const PINNED_TAB_NORMAL_MIN = 124; // px — fixed tab width (7.75rem)
const PINNED_TAB_COMPACT_MIN = 104; // px — compact tab width (6.5rem)
const PINNED_TAB_ICON_ONLY_MIN = 56; // px — icon-only tab width (3.5rem)
/** Pinned lane won't claim more than half the strip before the unpinned region gets room. */
const PINNED_LANE_MAX_RATIO = 0.5;

/** Tracks a DOM node's rendered width via ResizeObserver. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const measure = () => setWidth(node.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/**
 * Pure function so the compression stage is derived from one strip-width
 * measurement rather than a pinned-lane ResizeObserver feeding back into its
 * own rendered (and therefore compression-dependent) width.
 */
export function computePinnedLaneCompression(
  stripWidth: number,
  pinnedCount: number,
  unpinnedReserve: number,
): { compression: TabCompression; scrollFallback: boolean } {
  if (pinnedCount === 0) {
    return { compression: "normal", scrollFallback: false };
  }

  const available = Math.max(
    0,
    Math.min(stripWidth * PINNED_LANE_MAX_RATIO, stripWidth - unpinnedReserve),
  );
  const perTab = available / pinnedCount;

  if (perTab >= PINNED_TAB_NORMAL_MIN) {
    return { compression: "normal", scrollFallback: false };
  }
  if (perTab >= PINNED_TAB_COMPACT_MIN) {
    return { compression: "compact", scrollFallback: false };
  }
  if (perTab >= PINNED_TAB_ICON_ONLY_MIN) {
    return { compression: "icon-only", scrollFallback: false };
  }
  return { compression: "icon-only", scrollFallback: true };
}
