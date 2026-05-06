import { useJournalStore } from './use-journal-store';

jest.mock('@/lib/storage', () => ({
  storage: {
    getBoolean: jest.fn(() => false),
    set: jest.fn(),
  },
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
}));

describe('useJournalStore', () => {
  beforeEach(() => {
    useJournalStore.setState({
      entries: [],
      collapsedDayKeys: [],
      isHydrated: true,
    });
  });

  it('keeps entries sorted by start time when start times change', () => {
    const firstId = useJournalStore.getState().createEntry({
      text: 'first',
      startTime: '2026-04-29T09:00:00.000Z',
    });
    const secondId = useJournalStore.getState().createEntry({
      text: 'second',
      startTime: '2026-04-29T10:00:00.000Z',
    });
    const thirdId = useJournalStore.getState().createEntry({
      text: 'third',
      startTime: '2026-04-29T11:00:00.000Z',
    });

    useJournalStore.getState().updateEntry(secondId, {
      startTime: '2026-04-29T10:30:00.000Z',
    });

    const entries = useJournalStore.getState().entries;
    expect(entries.map(entry => entry.id)).toEqual([thirdId, secondId, firstId]);
  });
});
