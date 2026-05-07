import type { GradientPresetKey } from './journal-day-gradient';
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
import { sortEntriesByStartDesc } from './journal-utils';

const JOURNAL_STORAGE_KEY = 'journal-store-v1';
const JOURNAL_CLOUD_STORAGE_KEY = 'journal-store-v1-cloud';

type JournalStoreState = {
  entries: JournalEntry[];
  collapsedDayKeys: string[];
  gradientPreset: GradientPresetKey;
  isHydrated: boolean;
  createEntry: (input: {
    moodEmoji?: string | null;
    text: string;
    startTime?: string;
  }) => string;
  updateEntry: (id: string, input: Partial<Pick<JournalEntry, 'moodEmoji' | 'text' | 'startTime'>>) => void;
  toggleDayCollapsed: (dayKey: string) => void;
  setGradientPreset: (preset: GradientPresetKey) => void;
  hydrate: () => void;
};

type PersistedJournalState = Pick<JournalStoreState, 'entries' | 'collapsedDayKeys' | 'gradientPreset'>;

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

const _useJournalStore = create<JournalStoreState>((set, get) => ({
  entries: [],
  collapsedDayKeys: [],
  gradientPreset: 'default',
  isHydrated: false,
  createEntry: (input) => {
    const now = new Date().toISOString();
    const startTime = input.startTime ?? now;
    const entry: JournalEntry = {
      id: makeId(),
      createdAt: now,
      updatedAt: now,
      moodEmoji: input.moodEmoji ?? null,
      text: input.text,
      startTime,
    };

    const entries = sortEntriesByStartDesc([...get().entries, entry]);
    set({ entries });
    persistState({
      entries,
      collapsedDayKeys: get().collapsedDayKeys,
      gradientPreset: get().gradientPreset,
    });
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
    persistState({
      entries,
      collapsedDayKeys: get().collapsedDayKeys,
      gradientPreset: get().gradientPreset,
    });
  },
  toggleDayCollapsed: (dayKey) => {
    const exists = get().collapsedDayKeys.includes(dayKey);
    const collapsedDayKeys = exists
      ? get().collapsedDayKeys.filter(key => key !== dayKey)
      : [...get().collapsedDayKeys, dayKey];
    set({ collapsedDayKeys });
    persistState({ entries: get().entries, collapsedDayKeys, gradientPreset: get().gradientPreset });
  },
  setGradientPreset: (gradientPreset) => {
    set({ gradientPreset });
    persistState({
      entries: get().entries,
      collapsedDayKeys: get().collapsedDayKeys,
      gradientPreset,
    });
  },
  hydrate: () => {
    const stored = getItem<PersistedJournalState>(
      JOURNAL_STORAGE_KEY,
    );
    const localState: PersistedJournalState = {
      entries: stored?.entries ?? [],
      collapsedDayKeys: stored?.collapsedDayKeys ?? [],
      gradientPreset: stored?.gradientPreset ?? 'default',
    };
    void pullFromCloudIfNewer(localState)
      .then((selectedState) => {
        const entries = sortEntriesByStartDesc(selectedState.entries ?? []);
        const collapsedDayKeys = selectedState.collapsedDayKeys ?? [];
        set({
          entries,
          collapsedDayKeys,
          gradientPreset: selectedState.gradientPreset ?? 'default',
          isHydrated: true,
        });
        persistState({
          entries,
          collapsedDayKeys,
          gradientPreset: selectedState.gradientPreset ?? 'default',
        });
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
  persistState({
    entries: state.entries,
    collapsedDayKeys: state.collapsedDayKeys,
    gradientPreset: state.gradientPreset,
  });
}

export async function clearJournalFromICloud() {
  await removeICloudKey(JOURNAL_CLOUD_STORAGE_KEY);
}
