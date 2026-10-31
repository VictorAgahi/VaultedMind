const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isCalendarDay(day: string): boolean {
  const match = DAY_PATTERN.exec(day);
  if (!match) return false;
  const [year, month, date] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === date
  );
}

/** The calendar day (YYYY-MM-DD) of an instant in a time zone. */
export function localDay(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/**
 * The day a health sync belongs to. The shortcut always syncs "today", and its
 * date formatting depends on the iOS settings, so an unreadable or missing date
 * falls back to the user's current day instead of rejecting the whole sync.
 */
export function resolveSyncDate(
  raw: string | undefined,
  timezone: string,
  now: Date,
): string {
  const text = raw?.trim() ?? '';
  const day = text.slice(0, 10);
  if (isCalendarDay(day) && (text.length === 10 || text[10] === 'T')) {
    if (text.length === 10) return day;
    const instant = new Date(text);
    return Number.isNaN(instant.getTime()) ? day : localDay(instant, timezone);
  }
  return localDay(now, timezone);
}
