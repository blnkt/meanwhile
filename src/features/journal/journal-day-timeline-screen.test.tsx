import type { JournalEntry } from './types';

import * as React from 'react';
import { screen, setup } from '@/lib/test-utils';
import { JournalDayTimelineScreen } from './journal-day-timeline-screen';

const mockEntriesSelector = jest.fn<JournalEntry[], []>(() => []);
const mockGradientPresetSelector = jest.fn(() => 'default');

/* eslint-disable react/no-unnecessary-use-prefix -- mock must expose expo-router hook names */
jest.mock('expo-router', () => {
  const readSearchParams = jest.fn(() => ({ 'day-key': '2026-04-29' as const }));
  return {
    Link: ({ children }: { children: React.ReactNode }) => children,
    useLocalSearchParams: readSearchParams,
    useRouter: () => ({ push: jest.fn() }),
    readSearchParams,
  };
});
/* eslint-enable react/no-unnecessary-use-prefix */

const expoRouterMock = jest.requireMock('expo-router') as {
  readSearchParams: jest.Mock;
};

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
      entries: () => mockEntriesSelector(),
      gradientPreset: () => mockGradientPresetSelector(),
    },
  },
}));

function entry(input: {
  id: string;
  startTime: string;
  text: string;
}): JournalEntry {
  return {
    id: input.id,
    createdAt: input.startTime,
    updatedAt: input.startTime,
    startTime: input.startTime,
    moodEmoji: null,
    text: input.text,
  };
}

beforeEach(() => {
  expoRouterMock.readSearchParams.mockReturnValue({ 'day-key': '2026-04-29' });
});

describe('journalDayTimelineScreen entry cards', () => {
  it('shows entry body text but not duration labels', () => {
    mockEntriesSelector.mockReturnValue([
      entry({
        id: 'a',
        startTime: '2026-04-29T09:00:00.000Z',
        text: 'forty-five',
      }),
      entry({
        id: 'b',
        startTime: '2026-04-29T09:45:00.000Z',
        text: 'one hour',
      }),
      entry({
        id: 'c',
        startTime: '2026-04-29T10:45:00.000Z',
        text: 'half hour',
      }),
    ]);

    setup(<JournalDayTimelineScreen />);

    expect(screen.getByText('forty-five')).toBeOnTheScreen();
    expect(screen.getByText('one hour')).toBeOnTheScreen();
    expect(screen.getByText('half hour')).toBeOnTheScreen();
    expect(screen.queryByText('45m')).toBeNull();
    expect(screen.queryByText('1h')).toBeNull();
    expect(screen.queryByText('30m')).toBeNull();
  });

  it('omits entry body text when the entry body is empty', () => {
    mockEntriesSelector.mockReturnValue([
      entry({
        id: 'empty',
        startTime: '2026-04-29T09:00:00.000Z',
        text: '',
      }),
    ]);

    setup(<JournalDayTimelineScreen />);

    expect(screen.queryByText('(No text)')).toBeNull();
  });

  it('shows the saved toast when the route includes saved=1', () => {
    mockEntriesSelector.mockReturnValue([
      entry({
        id: 'a',
        startTime: '2026-04-29T09:00:00.000Z',
        text: 'note',
      }),
    ]);
    expoRouterMock.readSearchParams.mockReturnValue({ 'day-key': '2026-04-29', 'saved': '1' });

    setup(<JournalDayTimelineScreen />);

    expect(screen.getByText('Saved. Nice check-in.')).toBeOnTheScreen();
  });
});
