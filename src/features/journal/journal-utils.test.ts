import type { JournalEntry } from './types';

import {
  addMinutesCappedToEndOfDay,
  buildDayTimelineBlocks,
  buildSevenDayInsight,
  endOfDay,
  formatDateTimeInputValue,
  getDaySliceGradientColors,
  getNextEntryStart,
  groupEntriesByDay,
  parseDateTimeInput,
  toDayKey,
} from './journal-utils';

function makeEntry(partial: Partial<JournalEntry> & Pick<JournalEntry, 'id' | 'startTime'>): JournalEntry {
  const startTime = partial.startTime;
  return {
    id: partial.id,
    createdAt: partial.createdAt ?? startTime,
    updatedAt: partial.updatedAt ?? startTime,
    startTime,
    moodEmoji: partial.moodEmoji ?? null,
    text: partial.text ?? '',
  };
}

describe('journal-utils', () => {
  function expectCoreDayAndTimelineBehaviors() {
    const groupedEntries = [
      makeEntry({ id: 'a', startTime: '2026-04-28T08:00:00.000Z' }),
      makeEntry({ id: 'b', startTime: '2026-04-29T09:00:00.000Z' }),
      makeEntry({ id: 'c', startTime: '2026-04-28T14:00:00.000Z' }),
    ];
    const grouped = groupEntriesByDay(groupedEntries);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].dayKey).toBe('2026-04-29');
    expect(grouped[1].dayKey).toBe('2026-04-28');
    expect(grouped[1].entries.map(entry => entry.id)).toEqual(['c', 'a']);

    const nextStartEntries = [
      makeEntry({ id: 'a', startTime: '2026-04-29T09:00:00.000Z' }),
      makeEntry({ id: 'b', startTime: '2026-04-29T11:00:00.000Z' }),
      makeEntry({ id: 'c', startTime: '2026-04-29T13:00:00.000Z' }),
    ];
    expect(getNextEntryStart(nextStartEntries, '2026-04-29T10:30:00.000Z')).toBe('2026-04-29T11:00:00.000Z');
    expect(getNextEntryStart(nextStartEntries, '2026-04-29T14:00:00.000Z')).toBe(
      endOfDay('2026-04-29T14:00:00.000Z'),
    );

    const excludedEntries = [
      makeEntry({ id: 'a', startTime: '2026-04-29T09:00:00.000Z' }),
      makeEntry({ id: 'b', startTime: '2026-04-29T11:00:00.000Z' }),
      makeEntry({ id: 'c', startTime: '2026-04-29T12:00:00.000Z' }),
    ];
    expect(getNextEntryStart(excludedEntries, '2026-04-29T10:30:00.000Z', { excludeEntryId: 'b' })).toBe('2026-04-29T12:00:00.000Z');

    const fallbackBlockEntries = [
      makeEntry({ id: 'a', startTime: '2026-04-29T09:00:00.000Z' }),
      makeEntry({ id: 'b', startTime: '2026-04-29T10:00:00.000Z' }),
    ];
    const fallbackBlocks = buildDayTimelineBlocks(fallbackBlockEntries);
    expect(fallbackBlocks[0].startTime).toBe('2026-04-29T09:00:00.000Z');
    expect(fallbackBlocks[0].endTime).toBe('2026-04-29T10:00:00.000Z');
    expect(fallbackBlocks[1].endTime).toBe('2026-04-29T10:00:00.000Z');
  }

  it('covers critical grouping and timeline derivation behaviors', () => {
    expectCoreDayAndTimelineBehaviors();
  });

  describe('buildSevenDayInsight', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('computes top moods, peak window, and upward trend', () => {
      const entries = [
        makeEntry({ id: 'a', startTime: '2026-04-29T09:00:00.000Z', moodEmoji: '😀' }),
        makeEntry({ id: 'b', startTime: '2026-04-28T10:00:00.000Z', moodEmoji: '😀' }),
        makeEntry({ id: 'c', startTime: '2026-04-27T15:00:00.000Z', moodEmoji: '😐' }),
        makeEntry({ id: 'd', startTime: '2026-04-22T08:00:00.000Z', moodEmoji: '😔' }),
      ];

      const insight = buildSevenDayInsight(entries);

      expect(insight.entryCount).toBe(3);
      expect(insight.topMoods).toEqual(['😀', '😐']);
      expect(insight.busiestWindowKey).toBe('night');
      expect(insight.trendDirection).toBe('up');
      expect(insight.trendDelta).toBe(2);
    });

    it('returns steady trend when weekly counts match', () => {
      const entries = [
        makeEntry({ id: 'a', startTime: '2026-04-29T09:00:00.000Z' }),
        makeEntry({ id: 'b', startTime: '2026-04-21T09:00:00.000Z' }),
      ];

      const insight = buildSevenDayInsight(entries);

      expect(insight.entryCount).toBe(1);
      expect(insight.trendDirection).toBe('steady');
      expect(insight.trendDelta).toBe(0);
    });
  });

  it('creates stable day keys from ISO timestamps', () => {
    expect(toDayKey('2026-04-29T23:59:59.000Z')).toBe('2026-04-29');
  });
});

describe('journal-utils date helpers', () => {
  it('maps two ISO strings for the same instant to the same day key', () => {
    expect(toDayKey('2026-04-29T23:30:00.000-08:00')).toBe(toDayKey('2026-04-30T07:30:00.000Z'));
  });

  describe('parseDateTimeInput', () => {
    it('returns null for invalid values', () => {
      expect(parseDateTimeInput('')).toBeNull();
      expect(parseDateTimeInput('not-a-date')).toBeNull();
    });

    it('parses space-separated datetime the same as the T-normalized form', () => {
      const normalized = '2026-04-29 12:30'.trim().replace(' ', 'T');
      expect(parseDateTimeInput('2026-04-29 12:30')).toBe(new Date(normalized).toISOString());
    });

    it('accepts ISO strings', () => {
      expect(parseDateTimeInput('2026-04-29T12:30:00.000Z')).toBe('2026-04-29T12:30:00.000Z');
    });
  });

  describe('formatDateTimeInputValue', () => {
    it('formats using local calendar fields from the instant', () => {
      const iso = '2026-04-29T12:30:00.000Z';
      const date = new Date(iso);
      const y = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const day = `${date.getDate()}`.padStart(2, '0');
      const hour = `${date.getHours()}`.padStart(2, '0');
      const minute = `${date.getMinutes()}`.padStart(2, '0');
      expect(formatDateTimeInputValue(iso)).toBe(`${y}-${month}-${day} ${hour}:${minute}`);
    });
  });
});

describe('buildDayTimelineBlocks edge cases', () => {
  it('returns an empty list for no entries', () => {
    expect(buildDayTimelineBlocks([])).toEqual([]);
  });

  it('uses start time as end time when there is only one entry', () => {
    const blocks = buildDayTimelineBlocks([
      makeEntry({ id: 'solo', startTime: '2026-04-29T10:00:00.000Z' }),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].endTime).toBe('2026-04-29T10:00:00.000Z');
  });

  it('sorts by start time when input order is not chronological', () => {
    const blocks = buildDayTimelineBlocks([
      makeEntry({ id: 'late', startTime: '2026-04-29T11:00:00.000Z' }),
      makeEntry({ id: 'early', startTime: '2026-04-29T09:00:00.000Z' }),
    ]);
    expect(blocks.map(b => b.entryId)).toEqual(['early', 'late']);
    expect(blocks[0].endTime).toBe('2026-04-29T11:00:00.000Z');
  });
});

describe('addMinutesCappedToEndOfDay', () => {
  it('adds minutes when still inside the same local day', () => {
    expect(addMinutesCappedToEndOfDay('2026-04-29T12:00:00.000Z', 30)).toBe('2026-04-29T12:30:00.000Z');
  });

  it('caps at end of day when the shift would cross local midnight', () => {
    const localLate = new Date(2026, 3, 29, 23, 45, 0, 0);
    const anchor = localLate.toISOString();
    expect(addMinutesCappedToEndOfDay(anchor, 120)).toBe(endOfDay(anchor));
  });
});

describe('getDaySliceGradientColors', () => {
  it('returns two hex colors for a slice within the day (light scheme)', () => {
    const [a, b] = getDaySliceGradientColors({
      dayKey: '2026-04-29',
      startIso: '2026-04-29T09:00:00.000Z',
      endIso: '2026-04-29T15:00:00.000Z',
      scheme: 'light',
    });
    expect(a).toMatch(/^#[0-9a-f]{6}$/i);
    expect(b).toMatch(/^#[0-9a-f]{6}$/i);
    expect(a).not.toBe(b);
  });
});
