import type { JournalEntry } from './types';

import { create } from 'zustand';
import {
  getICloudJson,
  isICloudSyncEnabled,
  removeICloudKey,
  setICloudJson,
} from '@/lib/icloud-sync';
import { getItem, setItem } from '@/lib/storage';
import { createSelectors } from '@/lib/utils';
import { getNextEntryStart, sortEntriesByStartDesc } from './journal-utils';

const JOURNAL_STORAGE_KEY = 'journal-store-v1';
const JOURNAL_CLOUD_STORAGE_KEY = 'journal-store-v1-cloud';

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

type PersistedJournalState = Pick<JournalStoreState, 'entries' | 'collapsedDayKeys'>;

function latestUpdatedAtMs(entries: JournalEntry[]) {
  return entries.reduce((latest, entry) => {
    const next = new Date(entry.updatedAt).getTime();
    return Number.isFinite(next) && next > latest ? next : latest;
  }, 0);
}

function persistState(state: PersistedJournalState) {
  void setItem(JOURNAL_STORAGE_KEY, state);
  if (!isICloudSyncEnabled()) {
    return;
  }
  void setICloudJson(JOURNAL_CLOUD_STORAGE_KEY, state);
}

async function pullFromCloudIfNewer(localState: PersistedJournalState): Promise<PersistedJournalState> {
  if (!isICloudSyncEnabled()) {
    return localState;
  }
  const cloudState = await getICloudJson<PersistedJournalState>(JOURNAL_CLOUD_STORAGE_KEY);
  if (!cloudState) {
    return localState;
  }
  const localLatest = latestUpdatedAtMs(localState.entries);
  const cloudLatest = latestUpdatedAtMs(cloudState.entries);
  return cloudLatest > localLatest ? cloudState : localState;
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
    const stored = getItem<PersistedJournalState>(
      JOURNAL_STORAGE_KEY,
    );
    const localState: PersistedJournalState = {
      entries: stored?.entries ?? [],
      collapsedDayKeys: stored?.collapsedDayKeys ?? [],
    };
    void pullFromCloudIfNewer(localState)
      .then((selectedState) => {
        const normalizedEntries = (selectedState.entries ?? []).map(entry => ({
          ...entry,
          isEndTimeManual: entry.isEndTimeManual ?? false,
        }));
        const entries = recomputeImplicitEndTimes(normalizedEntries);
        const collapsedDayKeys = selectedState.collapsedDayKeys ?? [];
        set({
          entries,
          collapsedDayKeys,
          isHydrated: true,
        });
        persistState({ entries, collapsedDayKeys });
      })
      .catch(() => {
        set({ isHydrated: true });
      });
  },
}));

export const useJournalStore = createSelectors(_useJournalStore);

export const hydrateJournal = () => _useJournalStore.getState().hydrate();

export function syncJournalToICloud() {
  const state = _useJournalStore.getState();
  persistState({ entries: state.entries, collapsedDayKeys: state.collapsedDayKeys });
}

export async function clearJournalFromICloud() {
  await removeICloudKey(JOURNAL_CLOUD_STORAGE_KEY);
}
