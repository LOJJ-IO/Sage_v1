"use client";

import { IconBookmark, IconBookmarkFilled } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

type FileBookmarkButtonProps = {
  bookmarked: boolean;
  filename: string;
  onToggle: () => void;
};

export function FileBookmarkButton({
  bookmarked,
  filename,
  onToggle,
}: FileBookmarkButtonProps) {
  const Icon = bookmarked ? IconBookmarkFilled : IconBookmark;
  const label = bookmarked
    ? `Remove bookmark for ${filename}`
    : `Bookmark ${filename}`;

  return (
    <Button
      aria-label={label}
      aria-pressed={bookmarked}
      className={bookmarked ? "text-foreground" : "text-muted-foreground"}
      onClick={onToggle}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden className="size-4" stroke={2.2} />
    </Button>
  );
}
