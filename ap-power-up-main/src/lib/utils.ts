import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a tag by removing underscores and converting to title case
 * @param tag - The tag string to format (e.g., "chain_rule" -> "Chain Rule")
 * @returns Formatted tag string
 */
export function formatTag(tag: string): string {
  return tag
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
