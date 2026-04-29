import type { JournalEntry } from './types';

import {
  addMinutesCappedToEndOfDay,
  buildDayTimelineBlocks,
  buildSevenDayInsight,
  endOfDay,
  getNextEntryStart,
  groupEntriesByDay,
  toDayKey,
} from './journal-utils';

function makeEntry(partial: Partial<JournalEntry> & Pick<JournalEntry, 'id' | 'startTime'>): JournalEntry {
  const startTime = partial.startTime;
  return {
    id: partial.id,
    createdAt: partial.createdAt ?? startTime,
    updatedAt: partial.updatedAt ?? startTime,
    startTime,
    endTime: partial.endTime ?? endOfDay(startTime),
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
      addMinutesCappedToEndOfDay('2026-04-29T14:00:00.000Z', 30),
    );

    const excludedEntries = [
      makeEntry({ id: 'a', startTime: '2026-04-29T09:00:00.000Z' }),
      makeEntry({ id: 'b', startTime: '2026-04-29T11:00:00.000Z' }),
      makeEntry({ id: 'c', startTime: '2026-04-29T12:00:00.000Z' }),
    ];
    expect(getNextEntryStart(excludedEntries, '2026-04-29T10:30:00.000Z', { excludeEntryId: 'b' })).toBe('2026-04-29T12:00:00.000Z');

    const fallbackBlockEntries = [
      makeEntry({ id: 'a', startTime: '2026-04-29T09:00:00.000Z', endTime: '' }),
      makeEntry({ id: 'b', startTime: '2026-04-29T10:00:00.000Z', endTime: '' }),
    ];
    const fallbackBlocks = buildDayTimelineBlocks(fallbackBlockEntries);
    expect(fallbackBlocks[0].startTime).toBe('2026-04-29T09:00:00.000Z');
    expect(fallbackBlocks[0].endTime).toBe('2026-04-29T10:00:00.000Z');
    expect(fallbackBlocks[1].endTime).toBe(addMinutesCappedToEndOfDay('2026-04-29T10:00:00.000Z', 30));

    const overriddenBlockEntries = [
      makeEntry({
        id: 'a',
        startTime: '2026-04-29T09:00:00.000Z',
        endTime: '2026-04-29T11:15:00.000Z',
      }),
      makeEntry({ id: 'b', startTime: '2026-04-29T10:00:00.000Z' }),
    ];
    const overriddenBlocks = buildDayTimelineBlocks(overriddenBlockEntries);
    expect(overriddenBlocks[0].endTime).toBe('2026-04-29T11:15:00.000Z');
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
