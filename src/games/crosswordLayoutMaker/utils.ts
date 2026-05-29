export function coordKey(row: number, col: number): string {
  return `${row}-${col}`
}

export function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(1, Math.floor(parsed))
}

/**
 * Returns a CSS `calc(...)` padding string that produces a one-cell-wide
 * dark border frame around a grid preview. Because CSS % padding is relative
 * to the containing block's width, padding = width / (cols + 2) reserves one
 * cell-width of space on each side.
 */
export function borderedPreviewPadding(cols: number): string {
  return `calc(100% / ${cols + 2})`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
