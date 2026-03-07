import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns true if the first character of a string is an emoji (non-letter/digit/punctuation). */
function startsWithEmoji(str: string): boolean {
  if (!str) return false;
  const first = str.codePointAt(0) ?? 0;
  // Basic Latin letters, digits, and common punctuation are below U+00FF
  // Emoji typically start at U+2000+ or are in surrogate pair range
  return first > 0x00ff;
}

/** Sort comparator that pushes emoji-prefixed titles to the end. */
export function sortTitlesEmojiLast<T extends { title: string }>(a: T, b: T): number {
  const aEmoji = startsWithEmoji(a.title);
  const bEmoji = startsWithEmoji(b.title);
  if (aEmoji !== bEmoji) return aEmoji ? 1 : -1;
  return a.title.localeCompare(b.title);
}
