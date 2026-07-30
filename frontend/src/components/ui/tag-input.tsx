"use client";

import { IconX } from "@tabler/icons-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { INPUT_SHELL } from "@/components/ui/input";
import { TRUNCATE_CHIP_MAX_CLASS, TRUNCATE_ROW_CLASS } from "@/lib/ui/truncate";
import { cn } from "@/lib/utils";

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

/** Rank autocomplete: prefix matches first, then substring. */
function rankSuggestions(tags: string[], query: string): string[] {
  if (!query) {
    return tags;
  }
  const prefix: string[] = [];
  const rest: string[] = [];
  for (const tag of tags) {
    if (tag.startsWith(query)) {
      prefix.push(tag);
    } else if (tag.includes(query)) {
      rest.push(tag);
    }
  }
  return [...prefix, ...rest];
}

/** Viewport point just under the draft caret (single-line input). */
function getDraftCaretAnchor(input: HTMLInputElement): { top: number; left: number } {
  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);
  const caretIndex = input.selectionStart ?? input.value.length;
  const beforeCaret = input.value.slice(0, caretIndex);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let textWidth = 0;
  if (context) {
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    textWidth = context.measureText(beforeCaret).width;
  }

  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
  const caretLeft =
    rect.left + paddingLeft + borderLeft + textWidth - input.scrollLeft;

  // Keep the menu on-screen horizontally (menu min-width ≈ 8.4rem).
  const menuMinWidth = 8.415 * 16;
  const maxLeft = window.innerWidth - menuMinWidth - 8;
  const left = Math.max(8, Math.min(caretLeft, maxLeft));

  return { top: rect.bottom + 6, left };
}

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags from other files — shown in the focus popover / autocomplete. */
  suggestions?: string[];
  id?: string;
  className?: string;
};

export function TagInput({
  value,
  onChange,
  suggestions = [],
  id,
  className,
}: TagInputProps) {
  const listId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );

  const filteredSuggestions = useMemo(() => {
    const selected = new Set(value);
    const query = normalizeTag(draft);
    const available = suggestions.filter((tag) => !selected.has(tag));
    return rankSuggestions(available, query).slice(0, 12);
  }, [suggestions, value, draft]);

  const popoverOpen =
    focused && renamingIndex === null && filteredSuggestions.length > 0;

  useLayoutEffect(() => {
    if (!popoverOpen) {
      setMenuPos(null);
      return;
    }

    const update = () => {
      const input = draftRef.current;
      if (!input) {
        return;
      }
      setMenuPos(getDraftCaretAnchor(input));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("selectionchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("selectionchange", update);
    };
  }, [popoverOpen, value.length, draft]);

  useEffect(() => {
    setHighlight(0);
  }, [draft, popoverOpen]);

  useEffect(() => {
    if (renamingIndex !== null) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renamingIndex]);

  const commitDraft = (raw: string) => {
    const next = normalizeTag(raw);
    if (!next) {
      return;
    }
    if (value.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...value, next]);
    setDraft("");
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const commitRename = () => {
    if (renamingIndex === null) {
      return;
    }
    const next = normalizeTag(renameDraft);
    if (!next) {
      setRenamingIndex(null);
      setRenameDraft("");
      return;
    }
    const duplicate = value.some(
      (tag, i) => i !== renamingIndex && tag === next
    );
    if (duplicate) {
      setRenamingIndex(null);
      setRenameDraft("");
      return;
    }
    onChange(value.map((tag, i) => (i === renamingIndex ? next : tag)));
    setRenamingIndex(null);
    setRenameDraft("");
  };

  const onDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && popoverOpen) {
      event.preventDefault();
      setHighlight((current) =>
        current + 1 >= filteredSuggestions.length ? 0 : current + 1
      );
      return;
    }
    if (event.key === "ArrowUp" && popoverOpen) {
      event.preventDefault();
      setHighlight((current) =>
        current <= 0 ? filteredSuggestions.length - 1 : current - 1
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (popoverOpen && filteredSuggestions[highlight]) {
        commitDraft(filteredSuggestions[highlight]);
        return;
      }
      commitDraft(draft);
      return;
    }
    if (event.key === "Escape") {
      setFocused(false);
      draftRef.current?.blur();
    }
  };

  const onRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setRenamingIndex(null);
      setRenameDraft("");
    }
  };

  const suggestionsMenu =
    popoverOpen && menuPos && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={listRef}
            className="fixed z-100 max-h-56 min-w-[8.415rem] max-w-xs overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
            id={listId}
            role="listbox"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {filteredSuggestions.map((tag, index) => (
              <li key={tag} role="presentation">
                <button
                  aria-selected={index === highlight}
                  className={cn(
                    TRUNCATE_ROW_CLASS,
                    "block rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                    index === highlight
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commitDraft(tag);
                    draftRef.current?.focus();
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  role="option"
                  type="button"
                >
                  {tag}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={shellRef}
        className={cn(
          "flex w-full min-w-0 flex-wrap items-center gap-1.5 px-2.5 py-1.5",
          INPUT_SHELL,
          focused && "border-ring ring-2 ring-ring/40",
          className
        )}
        data-slot="tag-input"
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, input")) {
            return;
          }
          event.preventDefault();
          draftRef.current?.focus();
        }}
      >
        {value.map((tag, index) =>
          renamingIndex === index ? (
            <input
              key={`rename-${tag}`}
              ref={renameRef}
              aria-label={`Rename tag ${tag}`}
              className={cn(
                "h-7 min-w-16 rounded-full border border-ring bg-background px-2.5 text-xs text-foreground outline-none",
                TRUNCATE_CHIP_MAX_CLASS
              )}
              onBlur={commitRename}
              onChange={(event) => setRenameDraft(event.target.value)}
              onKeyDown={onRenameKeyDown}
              value={renameDraft}
            />
          ) : (
            <span
              key={`${tag}-${index}`}
              className={cn(
                "inline-flex h-7 w-fit shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 text-xs font-medium text-foreground",
                TRUNCATE_CHIP_MAX_CLASS
              )}
            >
              <button
                className="min-w-0 truncate text-left hover:underline"
                onClick={() => {
                  setRenamingIndex(index);
                  setRenameDraft(tag);
                }}
                title={tag}
                type="button"
              >
                {tag}
              </button>
              <button
                aria-label={`Remove ${tag}`}
                className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                onClick={() => removeAt(index)}
                type="button"
              >
                <IconX aria-hidden size={12} stroke={2.4} />
              </button>
            </span>
          )
        )}
        <input
          ref={draftRef}
          aria-autocomplete="list"
          aria-controls={popoverOpen ? listId : undefined}
          aria-expanded={popoverOpen}
          autoComplete="off"
          className="h-7 min-w-[3ch] flex-1 basis-[3ch] bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/65"
          id={id}
          onBlur={() => {
            window.setTimeout(() => {
              const active = document.activeElement;
              if (
                listRef.current?.contains(active) ||
                shellRef.current?.contains(active)
              ) {
                return;
              }
              setFocused(false);
            }, 0);
          }}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onDraftKeyDown}
          placeholder={value.length === 0 ? "Add a tag" : undefined}
          role="combobox"
          value={draft}
        />
      </div>
      {suggestionsMenu}
    </>
  );
}
