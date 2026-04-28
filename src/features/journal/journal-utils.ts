import type { DayGroup, JournalEntry, TimelineBlock } from './types';

export function toDayKey(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatReadableDate(dayKey: string) {
  const date = new Date(`${dayKey}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatReadableTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTimeInputValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function parseDateTimeInput(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

export function getTodayKey() {
  return toDayKey(new Date().toISOString());
}

export function sortEntriesByStartDesc(entries: JournalEntry[]) {
  return [...entries].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
}

export function groupEntriesByDay(entries: JournalEntry[]): DayGroup[] {
  const grouped = new Map<string, JournalEntry[]>();
  for (const entry of sortEntriesByStartDesc(entries)) {
    const key = toDayKey(entry.startTime);
    const list = grouped.get(key) ?? [];
    list.push(entry);
    grouped.set(key, list);
  }

  return [...grouped.entries()]
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([dayKey, dayEntries]) => ({ dayKey, entries: dayEntries }));
}

export function getNextEntryStart(
  entries: JournalEntry[],
  startTime: string,
  options?: { excludeEntryId?: string },
) {
  const target = new Date(startTime).getTime();
  const ascending = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const next = ascending.find((entry) => {
    if (options?.excludeEntryId && entry.id === options.excludeEntryId) {
      return false;
    }
    return new Date(entry.startTime).getTime() > target;
  });
  return next?.startTime ?? endOfDay(startTime);
}

export function endOfDay(dateValue: string) {
  const date = new Date(dateValue);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

export function addMinutesCappedToEndOfDay(dateValue: string, minutes: number) {
  const start = new Date(dateValue);
  const shifted = new Date(start.getTime() + minutes * 60_000);
  const dayEnd = new Date(endOfDay(dateValue));
  return shifted.getTime() > dayEnd.getTime()
    ? dayEnd.toISOString()
    : shifted.toISOString();
}

export function buildDayTimelineBlocks(entries: JournalEntry[]): TimelineBlock[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  return sorted.map((entry, index) => {
    const next = sorted[index + 1];
    const computedEnd = next ? next.startTime : endOfDay(entry.startTime);
    return {
      entryId: entry.id,
      startTime: entry.startTime,
      endTime: entry.endTime || computedEnd,
      moodEmoji: entry.moodEmoji,
      text: entry.text,
    };
  });
}
