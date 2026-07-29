"use client";

import { useEffect, useRef, useState } from "react";

/** Comfortable resting width before tabs start sharing space. */
export const TAB_MAX_WIDTH_PX = 124; // 7.75rem
/**
 * Below this width the label is hidden (icon + trailing action only).
 * Last resort after continuous flex-shrink has already narrowed the tab.
 */
export const TAB_ICON_ONLY_WIDTH_PX = 72;

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

/** True once continuous shrink has left no room for a readable filename. */
export function isIconOnlyWidth(widthPx: number): boolean {
  return widthPx > 0 && widthPx < TAB_ICON_ONLY_WIDTH_PX;
}
