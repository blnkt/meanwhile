import type { JournalEntry } from './types';

import * as React from 'react';
import { cleanup, screen, setup } from '@/lib/test-utils';
import { JournalTimelineScreen } from './journal-timeline-screen';

const mockPush = jest.fn();
const mockToggleDayCollapsed = jest.fn();
let mockEntries: JournalEntry[] = [];
let mockCollapsedDayKeys: string[] = [];

/* eslint-disable react/no-unnecessary-use-prefix -- mock must expose expo-router hook names */
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({ push: mockPush }),
}));
/* eslint-enable react/no-unnecessary-use-prefix */

jest.mock('@/components/ui', () => {
  const ReactModule = require('react');
  const RN = require('react-native');
  return {
    Button: ({ label, onPress }: { label?: string; onPress?: () => void }) =>
      ReactModule.createElement(RN.Pressable, { onPress }, ReactModule.createElement(RN.Text, null, label ?? 'Button')),
    FocusAwareStatusBar: () => null,
    Pressable: RN.Pressable,
    SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
      ReactModule.createElement(RN.View, null, children),
    ScrollView: RN.ScrollView,
    Text: RN.Text,
    TranslucentSurface: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactModule.createElement(RN.View, props, children),
    View: RN.View,
  };
});

jest.mock('./use-journal-store', () => ({
  useJournalStore: {
    use: {
      entries: () => mockEntries,
      collapsedDayKeys: () => mockCollapsedDayKeys,
      toggleDayCollapsed: () => mockToggleDayCollapsed,
    },
  },
}));

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

describe('journalTimelineScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
    mockEntries = [];
    mockCollapsedDayKeys = [];
    mockPush.mockClear();
    mockToggleDayCollapsed.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    cleanup();
  });

  it('shows empty state copy and seeded prompt when there are no entries', () => {
    setup(<JournalTimelineScreen />);

    expect(screen.getByText('No moments yet. Capture your first one today.')).toBeOnTheScreen();
    expect(screen.getByText(/Try:/)).toBeOnTheScreen();
    expect(screen.getByText(/What is your next first step\?/)).toBeOnTheScreen();
  });

  it('shows collapsed summary when the day is collapsed', () => {
    mockEntries = [
      makeEntry({ id: '1', startTime: '2026-04-29T09:00:00.000Z', moodEmoji: '😀', text: 'hello' }),
    ];
    mockCollapsedDayKeys = ['2026-04-29'];

    setup(<JournalTimelineScreen />);

    expect(screen.getByText(/1 entries/)).toBeOnTheScreen();
    expect(screen.getByText(/😀/)).toBeOnTheScreen();
    expect(screen.queryByText('hello')).toBeNull();
  });

  it('calls toggleDayCollapsed when the day header is pressed', async () => {
    mockEntries = [
      makeEntry({ id: '1', startTime: '2026-04-29T09:00:00.000Z', text: 'visible when expanded' }),
    ];

    const { user } = setup(<JournalTimelineScreen />);

    expect(screen.getByText('visible when expanded')).toBeOnTheScreen();

    await user.press(screen.getByText('▼'));

    expect(mockToggleDayCollapsed).toHaveBeenCalledWith('2026-04-29');
  });
});
