import type { JournalEntry } from './types';

import * as React from 'react';

import { cleanup, screen, setup } from '@/lib/test-utils';
import { JournalEntryEditorScreen } from './journal-entry-editor-screen';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCreateEntry = jest.fn();
const mockUpdateEntry = jest.fn();
const mockEntries: JournalEntry[] = [];
const mockJournalEntriesSelector = jest.fn(() => mockEntries);

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-modal-datetime-picker', () => 'DateTimePickerModal');
jest.mock('@/components/ui', () => ({
  Button: ({ label, onPress }: { label?: string; onPress?: () => void }) => {
    const ReactModule = require('react');
    const { Pressable: MockPressable, Text: MockText } = require('react-native');
    return ReactModule.createElement(
      MockPressable,
      { onPress },
      ReactModule.createElement(MockText, null, label ?? 'Button'),
    );
  },
  FocusAwareStatusBar: () => null,
  Input: ({ value, onChangeText }: { value?: string; onChangeText?: (value: string) => void }) => {
    const ReactModule = require('react');
    const { TextInput: MockInput } = require('react-native');
    return ReactModule.createElement(MockInput, { value, onChangeText });
  },
  Pressable: require('react-native').Pressable,
  ScrollView: require('react-native').ScrollView,
  Switch: ({ checked, onChange }: { checked?: boolean; onChange?: (value: boolean) => void }) => {
    const ReactModule = require('react');
    const { Switch: MockSwitch } = require('react-native');
    return ReactModule.createElement(MockSwitch, { value: checked, onValueChange: onChange });
  },
  Text: require('react-native').Text,
  View: require('react-native').View,
}));

jest.mock('./use-journal-store', () => ({
  useJournalStore: {
    use: {
      entries: () => mockJournalEntriesSelector(),
      createEntry: () => mockCreateEntry,
      updateEntry: () => mockUpdateEntry,
    },
  },
}));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe('journal entry editor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-29T12:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('blocks save when both mood and text are empty', async () => {
    const { user } = setup(<JournalEntryEditorScreen />);

    await user.press(screen.getByText('Create Entry'));

    expect(await screen.findByText('Add a mood or some text before saving.')).toBeOnTheScreen();
    expect(mockCreateEntry).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('creates entry and routes to matching day when text is provided', async () => {
    const { user } = setup(<JournalEntryEditorScreen />);

    await user.type(
      screen.getByPlaceholderText(/What did you just finish\?|What is your next first step\?|How is your energy right now\?/),
      'Finished standup and planning.',
    );
    await user.press(screen.getByText('Create Entry'));

    expect(mockCreateEntry).toHaveBeenCalledTimes(1);
    expect(mockCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Finished standup and planning.',
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/day/2026-04-29?saved=1');
  });

  it('supports save-and-add-another fast path', async () => {
    const { user } = setup(<JournalEntryEditorScreen />);

    await user.type(
      screen.getByPlaceholderText(/What did you just finish\?|What is your next first step\?|How is your energy right now\?/),
      'Quick check-in note.',
    );
    await user.press(screen.getByText('Save and Add Another'));

    expect(mockCreateEntry).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/entry/new?day-key=2026-04-29');
  });
});
