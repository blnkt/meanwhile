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
  createEntry: (input: { moodEmoji: string; text: string; startTime?: string; endTime?: string }) => string;
  updateEntry: (id: string, input: Partial<Pick<JournalEntry, 'moodEmoji' | 'text' | 'startTime' | 'endTime'>>) => void;
  toggleDayCollapsed: (dayKey: string) => void;
  hydrate: () => void;
};

function persistState(state: Pick<JournalStoreState, 'entries' | 'collapsedDayKeys'>) {
  void setItem(JOURNAL_STORAGE_KEY, state);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const _useJournalStore = create<JournalStoreState>((set, get) => ({
  entries: [],
  collapsedDayKeys: [],
  isHydrated: false,
  createEntry: (input) => {
    const now = new Date().toISOString();
    const startTime = input.startTime ?? now;
    const endTime = input.endTime ?? getNextEntryStart(get().entries, startTime);
    const entry: JournalEntry = {
      id: makeId(),
      createdAt: now,
      updatedAt: now,
      moodEmoji: input.moodEmoji,
      text: input.text,
      startTime,
      endTime,
    };

    const entries = sortEntriesByStartDesc([...get().entries, entry]);
    set({ entries });
    persistState({ entries, collapsedDayKeys: get().collapsedDayKeys });
    return entry.id;
  },
  updateEntry: (id, input) => {
    const now = new Date().toISOString();
    const entries = sortEntriesByStartDesc(
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
      set({
        entries: sortEntriesByStartDesc(stored.entries ?? []),
        collapsedDayKeys: stored.collapsedDayKeys ?? [],
      });
    }
    set({ isHydrated: true });
  },
}));

export const useJournalStore = createSelectors(_useJournalStore);

export const hydrateJournal = () => _useJournalStore.getState().hydrate();
