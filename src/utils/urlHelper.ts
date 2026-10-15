/**
 * URL and Hyperlink Helper Utilities for TodoList & Dynamic Tabular Matrix
 */
import { TodoListColumn } from '../types';

/**
 * Standard regex to detect if a string matches a URL format
 */
const URL_PATTERN = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/i;

/**
 * Checks whether a column is intended to hold URLs / hyperlinks.
 * Checks col.type === 'url' OR if column name contains keywords like 'url', 'link', 'website', 'enlace', etc.
 */
export function isUrlColumn(column?: TodoListColumn): boolean {
  if (!column) return false;
  if (column.type === 'url') return true;
  const name = (column.name || '').toLowerCase();
  return (
    name.includes('url') ||
    name.includes('link') ||
    name.includes('website') ||
    name.includes('web') ||
    name.includes('enlace') ||
    name.includes('sitio') ||
    name.includes('pagina') ||
    name.includes('href')
  );
}

/**
 * Validates if the string has a valid URL format
 */
export function isValidUrl(value: string): boolean {
  if (!value || !value.trim()) return true; // empty cells are allowed until user inputs
  const trimmed = value.trim();

  // If it contains spaces, it's not a valid URL
  if (/\s/.test(trimmed)) return false;

  // Check pattern match
  if (!URL_PATTERN.test(trimmed)) return false;

  // Double-check via URL constructor
  try {
    const withProtocol =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    return Boolean(parsed.hostname && parsed.hostname.includes('.'));
  } catch {
    return false;
  }
}

/**
 * Ensures a URL starts with http:// or https:// for safe anchor navigation
 */
export function ensureHttpUrl(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Extracts a concise display label from a URL (e.g., "create.roblox.com/docs" -> "create.roblox.com")
 */
export function getUrlDisplayLabel(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  try {
    const withProtocol = ensureHttpUrl(trimmed);
    const parsed = new URL(withProtocol);
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${parsed.hostname}${pathname}`;
  } catch {
    return trimmed;
  }
}
