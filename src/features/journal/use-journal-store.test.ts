import { useJournalStore } from './use-journal-store';

jest.mock('@/lib/storage', () => ({
  storage: {
    getBoolean: jest.fn(() => false),
    set: jest.fn(),
  },
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
}));

describe('useJournalStore dynamic end-time recalculation', () => {
  beforeEach(() => {
    useJournalStore.setState({
      entries: [],
      collapsedDayKeys: [],
      isHydrated: true,
    });
  });

  it('recomputes implicit previous end times when start times change', () => {
    const firstId = useJournalStore.getState().createEntry({
      text: 'first',
      startTime: '2026-04-29T09:00:00.000Z',
    });
    const secondId = useJournalStore.getState().createEntry({
      text: 'second',
      startTime: '2026-04-29T10:00:00.000Z',
      endTime: '2026-04-29T10:45:00.000Z',
      isEndTimeManual: true,
    });
    const thirdId = useJournalStore.getState().createEntry({
      text: 'third',
      startTime: '2026-04-29T11:00:00.000Z',
    });

    useJournalStore.getState().updateEntry(secondId, {
      startTime: '2026-04-29T10:30:00.000Z',
    });

    const entries = useJournalStore.getState().entries;
    const byId = Object.fromEntries(entries.map(entry => [entry.id, entry]));

    expect(byId[firstId].endTime).toBe('2026-04-29T10:30:00.000Z');
    expect(byId[secondId].endTime).toBe('2026-04-29T10:45:00.000Z');
    expect(byId[secondId].isEndTimeManual).toBe(true);
    expect(byId[thirdId].endTime).toBe('2026-04-29T11:30:00.000Z');
  });
});
