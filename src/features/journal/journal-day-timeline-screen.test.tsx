import type { JournalEntry } from './types';

import * as React from 'react';
import { screen, setup } from '@/lib/test-utils';
import { JournalDayTimelineScreen } from './journal-day-timeline-screen';

const mockEntriesSelector = jest.fn<JournalEntry[], []>(() => []);

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => ({ 'day-key': '2026-04-29' }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/ui', () => {
  const ReactModule = require('react');
  const RN = require('react-native');
  return {
    Button: ({ label }: { label?: string }) =>
      ReactModule.createElement(RN.Text, null, label ?? 'Button'),
    FocusAwareStatusBar: () => null,
    Pressable: RN.Pressable,
    ScrollView: RN.ScrollView,
    Text: RN.Text,
    View: RN.View,
  };
});

jest.mock('./use-journal-store', () => ({
  useJournalStore: {
    use: {
      entries: () => mockEntriesSelector(),
    },
  },
}));

function entry(input: {
  id: string;
  startTime: string;
  endTime: string;
  text: string;
}): JournalEntry {
  return {
    id: input.id,
    createdAt: input.startTime,
    updatedAt: input.startTime,
    startTime: input.startTime,
    endTime: input.endTime,
    isEndTimeManual: true,
    moodEmoji: null,
    text: input.text,
  };
}

describe('journalDayTimelineScreen duration labels', () => {
  it('renders compact minute/hour labels for day blocks', () => {
    mockEntriesSelector.mockReturnValue([
      entry({
        id: 'a',
        startTime: '2026-04-29T09:00:00.000Z',
        endTime: '2026-04-29T09:45:00.000Z',
        text: 'forty-five',
      }),
      entry({
        id: 'b',
        startTime: '2026-04-29T10:00:00.000Z',
        endTime: '2026-04-29T11:00:00.000Z',
        text: 'one hour',
      }),
      entry({
        id: 'c',
        startTime: '2026-04-29T12:00:00.000Z',
        endTime: '2026-04-29T13:20:00.000Z',
        text: 'mixed',
      }),
    ]);

    setup(<JournalDayTimelineScreen />);

    expect(screen.getByText('45m')).toBeOnTheScreen();
    expect(screen.getByText('1h')).toBeOnTheScreen();
    expect(screen.getByText('1h 20m')).toBeOnTheScreen();
  });
});
