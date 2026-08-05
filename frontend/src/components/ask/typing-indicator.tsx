"use client";

import { motion } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";

/** Enter/exit uses the standard ease-out-quart bubble-entrance curve. */
const BUBBLE_TRANSITION = { duration: 0.18, ease: [0.165, 0.84, 0.44, 1] as const };

/** Shown in place of the next assistant bubble while a reply is in flight. */
export function TypingIndicator() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mr-8 flex w-fit items-center gap-2 rounded-2xl bg-muted px-3 py-2.5 text-sm text-muted-foreground"
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      initial={{ opacity: 0, y: 4 }}
      transition={BUBBLE_TRANSITION}
    >
      <Spinner className="size-3.5" />
      Thinking…
    </motion.div>
  );
}
