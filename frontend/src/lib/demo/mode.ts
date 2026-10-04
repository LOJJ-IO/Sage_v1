/**
 * `/demo` runs the real app UI against an in-browser mock backend seeded with
 * a fictional boutique's docs — no login, no API, nothing leaves the browser.
 * Decided by URL so the same page component serves `/` and `/demo`.
 */
export function isDemoRoute() {
  if (typeof window === "undefined") {
    return false;
  }

  const path = window.location.pathname;
  return path === "/demo" || path.startsWith("/demo/");
}
