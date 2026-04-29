import type { JournalEntry } from './types';

import { create } from 'zustand';
import { getItem, setItem } from '@/lib/storage';
import { createSelectors } from '@/lib/utils';
import { getNextEntryStart, sortEntriesByStartDesc } from './journal-utils';

const JOURNAL_STORAGE_KEY = 'journal-store-v1';

type JournalStoreState = {
  entries: JournalEntry[];
  collapsedDayKeys: string[];
  isHydrated: boolean;
  createEntry: (input: {
    moodEmoji?: string | null;
    text: string;
    startTime?: string;
    endTime?: string;
    isEndTimeManual?: boolean;
  }) => string;
  updateEntry: (id: string, input: Partial<Pick<JournalEntry, 'moodEmoji' | 'text' | 'startTime' | 'endTime' | 'isEndTimeManual'>>) => void;
  toggleDayCollapsed: (dayKey: string) => void;
  hydrate: () => void;
};

function persistState(state: Pick<JournalStoreState, 'entries' | 'collapsedDayKeys'>) {
  void setItem(JOURNAL_STORAGE_KEY, state);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function recomputeImplicitEndTimes(entries: JournalEntry[]) {
  const ascending = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  const recomputed = ascending.map((entry) => {
    if (entry.isEndTimeManual) {
      return entry;
    }
    return {
      ...entry,
      endTime: getNextEntryStart(ascending, entry.startTime, { excludeEntryId: entry.id }),
    };
  });
  return sortEntriesByStartDesc(recomputed);
}

const _useJournalStore = create<JournalStoreState>((set, get) => ({
  entries: [],
  collapsedDayKeys: [],
  isHydrated: false,
  createEntry: (input) => {
    const now = new Date().toISOString();
    const startTime = input.startTime ?? now;
    const isEndTimeManual = Boolean(input.isEndTimeManual);
    const endTime = isEndTimeManual
      ? (input.endTime ?? getNextEntryStart(get().entries, startTime))
      : getNextEntryStart(get().entries, startTime);
    const entry: JournalEntry = {
      id: makeId(),
      createdAt: now,
      updatedAt: now,
      moodEmoji: input.moodEmoji ?? null,
      text: input.text,
      startTime,
      endTime,
      isEndTimeManual,
    };

    const entries = recomputeImplicitEndTimes([...get().entries, entry]);
    set({ entries });
    persistState({ entries, collapsedDayKeys: get().collapsedDayKeys });
    return entry.id;
  },
  updateEntry: (id, input) => {
    const now = new Date().toISOString();
    const entries = recomputeImplicitEndTimes(
      get().entries.map(entry =>
        entry.id === id
          ? {
              ...entry,
              ...input,
              updatedAt: now,
            }
          : entry,
      ),
    );

    set({ entries });
    persistState({ entries, collapsedDayKeys: get().collapsedDayKeys });
  },
  toggleDayCollapsed: (dayKey) => {
    const exists = get().collapsedDayKeys.includes(dayKey);
    const collapsedDayKeys = exists
      ? get().collapsedDayKeys.filter(key => key !== dayKey)
      : [...get().collapsedDayKeys, dayKey];
    set({ collapsedDayKeys });
    persistState({ entries: get().entries, collapsedDayKeys });
  },
  hydrate: () => {
    const stored = getItem<Pick<JournalStoreState, 'entries' | 'collapsedDayKeys'>>(
      JOURNAL_STORAGE_KEY,
    );
    if (stored) {
      const normalizedEntries = (stored.entries ?? []).map(entry => ({
        ...entry,
        isEndTimeManual: entry.isEndTimeManual ?? false,
      }));
      set({
        entries: recomputeImplicitEndTimes(normalizedEntries),
        collapsedDayKeys: stored.collapsedDayKeys ?? [],
      });
    }
    set({ isHydrated: true });
  },
}));

export const useJournalStore = createSelectors(_useJournalStore);

export const hydrateJournal = () => _useJournalStore.getState().hydrate();
