import type { UserPreferences } from '../../user/domain/entities/user.entity.js';

export const REMINDER_WINDOW_MINUTES = 15;

export interface LocalMoment {
  /** Local calendar date, "YYYY-MM-DD". */
  date: string;
  /** Minutes elapsed since local midnight. */
  minutes: number;
}

export function toLocalMoment(now: Date, timeZone: string): LocalMoment {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

export function parseReminderMinutes(reminderTime: string): number {
  const [hours, minutes] = reminderTime.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * A reminder is due once per local day, during the quarter-hour that starts at the chosen time.
 */
export function isReminderDue(
  now: Date,
  preferences: Pick<
    UserPreferences,
    'reminderEnabled' | 'reminderTime' | 'timezone' | 'lastReminderOn'
  >,
): boolean {
  if (!preferences.reminderEnabled) return false;
  const local = toLocalMoment(now, preferences.timezone);
  if (preferences.lastReminderOn === local.date) return false;
  const start = parseReminderMinutes(preferences.reminderTime);
  return (
    local.minutes >= start && local.minutes < start + REMINDER_WINDOW_MINUTES
  );
}
