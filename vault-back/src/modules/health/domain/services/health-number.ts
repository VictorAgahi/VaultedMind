const WHITESPACE = /[\s\u00a0\u202f]/g;

/**
 * Reads a number the way a localized Shortcuts text may write it ("8 042,5", "8,042.5",
 * "7,5"). Returns null when the text is not a finite number.
 */
export function parseHealthNumber(raw: string): number | null {
  const compact = raw.replace(WHITESPACE, '');
  if (compact === '') return null;

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIsComma = lastComma > lastDot;
    normalized = decimalIsComma
      ? compact.replace(/\./g, '').replace(',', '.')
      : compact.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const commaCount = compact.split(',').length - 1;
    normalized =
      commaCount > 1 ? compact.replace(/,/g, '') : compact.replace(',', '.');
  } else {
    normalized = compact;
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
