import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sage — Demo",
  description: "Try Sage with a sample boutique's store docs. No sign-in needed.",
};

// Same app as `/`; the API layer swaps in the in-browser mock backend on this
// route (see `lib/demo/mode.ts`).
export { default } from "../page";
