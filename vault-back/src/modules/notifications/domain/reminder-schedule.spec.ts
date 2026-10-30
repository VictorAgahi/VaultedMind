import { isReminderDue, toLocalMoment } from './reminder-schedule.js';

describe('reminder schedule', () => {
  const basePreferences = {
    reminderEnabled: true,
    reminderTime: '21:00',
    timezone: 'Europe/Paris',
    lastReminderOn: undefined,
  };

  it('should compute the local date and minutes in the user time zone', () => {
    // Arrange
    const now = new Date('2026-10-29T23:30:00Z');

    // Act
    const local = toLocalMoment(now, 'Europe/Paris');

    // Assert
    expect(local).toEqual({ date: '2026-10-30', minutes: 30 });
  });

  it('should be due during the quarter-hour starting at the reminder time', () => {
    // Arrange
    const now = new Date('2026-10-29T20:07:00Z'); // 21:07 in Paris (CET)

    // Act
    const due = isReminderDue(now, basePreferences);

    // Assert
    expect(due).toBe(true);
  });

  it('should not be due outside the reminder window', () => {
    // Arrange
    const now = new Date('2026-10-29T20:16:00Z'); // 21:16 in Paris

    // Act
    const due = isReminderDue(now, basePreferences);

    // Assert
    expect(due).toBe(false);
  });

  it('should not be due twice on the same local day', () => {
    // Arrange
    const now = new Date('2026-10-29T20:05:00Z');

    // Act
    const due = isReminderDue(now, {
      ...basePreferences,
      lastReminderOn: '2026-10-29',
    });

    // Assert
    expect(due).toBe(false);
  });

  it('should not be due when reminders are disabled', () => {
    // Arrange
    const now = new Date('2026-10-29T20:05:00Z');

    // Act
    const due = isReminderDue(now, {
      ...basePreferences,
      reminderEnabled: false,
    });

    // Assert
    expect(due).toBe(false);
  });

  it('should respect the user time zone', () => {
    // Arrange
    const now = new Date('2026-10-29T13:00:00Z'); // 09:00 in Montreal

    // Act
    const due = isReminderDue(now, {
      ...basePreferences,
      reminderTime: '09:00',
      timezone: 'America/Montreal',
    });

    // Assert
    expect(due).toBe(true);
  });
});
