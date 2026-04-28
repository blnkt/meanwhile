import type { JournalEntry } from './types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Platform, TextInput } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { Button, FocusAwareStatusBar, Input, Pressable, ScrollView, Text, View } from '@/components/ui';
import {
  formatDateTimeInputValue,
  formatReadableTime,
  getNextEntryStart,
  parseDateTimeInput,
} from './journal-utils';
import { useDictation } from './use-dictation';
import { useJournalStore } from './use-journal-store';

const MOOD_OPTIONS = ['😀', '🙂', '😐', '😔', '😤', '😍'];

type EntryDraft = {
  moodEmoji: string;
  text: string;
  startValue: string;
  endValue: string;
};

function buildInitialDraft(entry: JournalEntry | undefined, entries: JournalEntry[]): EntryDraft {
  const nowIso = new Date().toISOString();
  const startTime = entry?.startTime ?? nowIso;
  const endTime = entry?.endTime ?? getNextEntryStart(
    entries,
    startTime,
    entry ? { excludeEntryId: entry.id } : undefined,
  );
  return {
    moodEmoji: entry?.moodEmoji ?? '🙂',
    text: entry?.text ?? '',
    startValue: formatDateTimeInputValue(startTime),
    endValue: formatDateTimeInputValue(endTime),
  };
}

function MoodPicker({ selectedMood, onSelect }: { selectedMood: string; onSelect: (mood: string) => void }) {
  return (
    <>
      <Text className="mb-1 font-semibold">Mood</Text>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {MOOD_OPTIONS.map(option => (
          <Button
            key={option}
            label={option}
            size="sm"
            fullWidth={false}
            variant={selectedMood === option ? 'default' : 'outline'}
            onPress={() => onSelect(option)}
          />
        ))}
      </View>
    </>
  );
}

function DictationCard({ status, errorMessage, onStart, onStop }: { status: string; errorMessage: string | null; onStart: () => void; onStop: () => void }) {
  return (
    <View className="mt-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <Text className="font-semibold">Dictation</Text>
      <Text className="text-sm text-neutral-600 dark:text-neutral-300">
        Status:
        {' '}
        {status}
      </Text>
      {errorMessage
        ? (
            <Text className="mt-1 text-sm text-red-500">{errorMessage}</Text>
          )
        : null}

      <View className="mt-2 flex-row gap-2">
        <Button
          label="Start Dictation"
          size="sm"
          fullWidth={false}
          variant="outline"
          onPress={onStart}
        />
        <Button
          label="Stop"
          size="sm"
          fullWidth={false}
          variant="outline"
          onPress={onStop}
        />
      </View>
    </View>
  );
}

type DateTimeFieldProps = {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  pickerVisible: boolean;
  onOpen: () => void;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

function DateTimeField({
  label,
  value,
  onChangeText,
  pickerVisible,
  onOpen,
  onClose,
  onConfirm,
}: DateTimeFieldProps) {
  const parsed = parseDateTimeInput(value);
  const pickerDate = parsed ? new Date(parsed) : new Date();
  const displayValue = pickerDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  if (Platform.OS === 'web') {
    return (
      <Input
        label={`${label} (YYYY-MM-DD HH:mm)`}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
      />
    );
  }

  return (
    <View className="mb-2">
      <Text className="mb-1 text-lg text-neutral-700 dark:text-neutral-100">{label}</Text>
      <Pressable
        className="rounded-xl border-[0.5px] border-neutral-300 bg-neutral-100 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800"
        onPress={onOpen}
      >
        <Text className="font-medium text-black dark:text-white">{displayValue}</Text>
      </Pressable>
      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="datetime"
        date={pickerDate}
        onConfirm={onConfirm}
        onCancel={onClose}
      />
    </View>
  );
}

type EntryFormProps = {
  editingEntry: JournalEntry | undefined;
  draft: EntryDraft;
  autoEndValue: string | null;
  showCustomEndTime: boolean;
  setShowCustomEndTime: React.Dispatch<React.SetStateAction<boolean>>;
  validationMessage: string | null;
  dictation: ReturnType<typeof useDictation>;
  setDraft: React.Dispatch<React.SetStateAction<EntryDraft>>;
  onSave: () => void;
  onBack: () => void;
};

type EndTimeSectionProps = {
  draft: EntryDraft;
  autoEndValue: string | null;
  showCustomEndTime: boolean;
  activePicker: 'start' | 'end' | null;
  setActivePicker: React.Dispatch<React.SetStateAction<'start' | 'end' | null>>;
  setShowCustomEndTime: React.Dispatch<React.SetStateAction<boolean>>;
  setDraft: React.Dispatch<React.SetStateAction<EntryDraft>>;
};

function EndTimeSection({
  draft,
  autoEndValue,
  showCustomEndTime,
  activePicker,
  setActivePicker,
  setShowCustomEndTime,
  setDraft,
}: EndTimeSectionProps) {
  return (
    <View className="mb-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <Text className="font-semibold">End Time</Text>
      <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        {showCustomEndTime
          ? `Custom: ${draft.endValue}`
          : `Auto: ${autoEndValue ?? 'Invalid start time'}`}
      </Text>
      {!showCustomEndTime
        ? (
            <Button
              className="mt-2"
              label="Set Custom End Time"
              size="sm"
              variant="outline"
              fullWidth={false}
              onPress={() => setShowCustomEndTime(true)}
            />
          )
        : (
            <>
              <DateTimeField
                label="Custom End Time"
                value={draft.endValue}
                onChangeText={endValue =>
                  setDraft(previous => ({
                    ...previous,
                    endValue,
                  }))}
                pickerVisible={activePicker === 'end'}
                onOpen={() => setActivePicker('end')}
                onClose={() => setActivePicker(null)}
                onConfirm={(date) => {
                  const endValue = formatDateTimeInputValue(date.toISOString());
                  setDraft(previous => ({
                    ...previous,
                    endValue,
                  }));
                  setActivePicker(null);
                }}
              />
              <Button
                label="Use Auto End Time"
                size="sm"
                variant="outline"
                fullWidth={false}
                onPress={() => setShowCustomEndTime(false)}
              />
            </>
          )}
    </View>
  );
}

function StartTimePreview({ startValue }: { startValue: string }) {
  return (
    <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
      Current start preview:
      {' '}
      {formatReadableTime(parseDateTimeInput(startValue) ?? new Date().toISOString())}
    </Text>
  );
}

function DictationSection({
  dictation,
}: {
  dictation: ReturnType<typeof useDictation>;
}) {
  if (Platform.OS === 'web') {
    return null;
  }
  return (
    <DictationCard
      status={dictation.status}
      errorMessage={dictation.errorMessage}
      onStart={dictation.startDictation}
      onStop={dictation.stopDictation}
    />
  );
}

function EntryForm({
  editingEntry,
  draft,
  autoEndValue,
  showCustomEndTime,
  setShowCustomEndTime,
  validationMessage,
  dictation,
  setDraft,
  onSave,
  onBack,
}: EntryFormProps) {
  const [activePicker, setActivePicker] = React.useState<'start' | 'end' | null>(null);

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <FocusAwareStatusBar />
      <ScrollView className="flex-1 px-4 pt-14">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold">
            {editingEntry ? 'Edit Entry' : 'New Entry'}
          </Text>
          <Button
            label="Back"
            size="sm"
            variant="outline"
            fullWidth={false}
            onPress={onBack}
          />
        </View>

        <MoodPicker
          selectedMood={draft.moodEmoji}
          onSelect={moodEmoji =>
            setDraft(previous => ({
              ...previous,
              moodEmoji,
            }))}
        />

        <DateTimeField
          label="Start Time"
          value={draft.startValue}
          onChangeText={startValue =>
            setDraft(previous => ({
              ...previous,
              startValue,
            }))}
          pickerVisible={activePicker === 'start'}
          onOpen={() => setActivePicker('start')}
          onClose={() => setActivePicker(null)}
          onConfirm={(date) => {
            const startValue = formatDateTimeInputValue(date.toISOString());
            setDraft(previous => ({
              ...previous,
              startValue,
            }));
            setActivePicker(null);
          }}
        />
        <EndTimeSection
          draft={draft}
          autoEndValue={autoEndValue}
          showCustomEndTime={showCustomEndTime}
          activePicker={activePicker}
          setActivePicker={setActivePicker}
          setShowCustomEndTime={setShowCustomEndTime}
          setDraft={setDraft}
        />

        <Text className="mt-2 mb-1 font-semibold">Entry Text</Text>
        <TextInput
          className="min-h-36 rounded-xl border border-neutral-300 bg-neutral-100 p-3 text-base text-black dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          multiline
          textAlignVertical="top"
          value={draft.text}
          onChangeText={text =>
            setDraft(previous => ({
              ...previous,
              text,
            }))}
          placeholder="How are you feeling right now?"
          placeholderTextColor="#9ca3af"
        />

        <StartTimePreview startValue={draft.startValue} />
        <DictationSection dictation={dictation} />

        {validationMessage
          ? (
              <Text className="mt-2 text-red-500">{validationMessage}</Text>
            )
          : null}

        <Button
          className="mt-4 mb-8"
          label={editingEntry ? 'Save Changes' : 'Create Entry'}
          onPress={onSave}
        />
      </ScrollView>
    </View>
  );
}

function useSaveEntry({
  editingEntry,
  draft,
  entries,
  showCustomEndTime,
  setValidationMessage,
}: {
  editingEntry: JournalEntry | undefined;
  draft: EntryDraft;
  entries: JournalEntry[];
  showCustomEndTime: boolean;
  setValidationMessage: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const router = useRouter();
  const createEntry = useJournalStore.use.createEntry();
  const updateEntry = useJournalStore.use.updateEntry();

  return React.useCallback(() => {
    const start = parseDateTimeInput(draft.startValue);
    if (!start) {
      setValidationMessage('Please choose a valid start time.');
      return;
    }
    const computedAutoEnd = getNextEntryStart(
      entries,
      start,
      editingEntry ? { excludeEntryId: editingEntry.id } : undefined,
    );
    const customEnd = parseDateTimeInput(draft.endValue);
    const end = showCustomEndTime ? customEnd : computedAutoEnd;
    if (!end) {
      setValidationMessage('Please choose a valid end time.');
      return;
    }
    if (new Date(end).getTime() <= new Date(start).getTime()) {
      setValidationMessage('End time must be later than start time.');
      return;
    }
    setValidationMessage(null);

    if (editingEntry) {
      updateEntry(editingEntry.id, {
        moodEmoji: draft.moodEmoji,
        text: draft.text,
        startTime: start,
        endTime: end,
      });
    }
    else {
      createEntry({
        moodEmoji: draft.moodEmoji,
        text: draft.text,
        startTime: start,
        endTime: end,
      });
    }
    router.replace('/');
  }, [createEntry, draft.endValue, draft.moodEmoji, draft.startValue, draft.text, editingEntry, entries, router, setValidationMessage, showCustomEndTime, updateEntry]);
}

export function JournalEntryEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 'entry-id'?: string }>();
  const entries = useJournalStore.use.entries();
  const editingEntry = entries.find(entry => entry.id === params['entry-id']);
  const draftSeed = React.useMemo(
    () => buildInitialDraft(editingEntry, entries),
    [editingEntry, entries],
  );
  const [draft, setDraft] = React.useState(() => draftSeed);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const [showCustomEndTime, setShowCustomEndTime] = React.useState(false);
  const autoEndValue = React.useMemo(() => {
    const start = parseDateTimeInput(draft.startValue);
    if (!start) {
      return null;
    }
    return formatDateTimeInputValue(
      getNextEntryStart(
        entries,
        start,
        editingEntry ? { excludeEntryId: editingEntry.id } : undefined,
      ),
    );
  }, [draft.startValue, editingEntry, entries]);
  const dictation = useDictation({
    onTranscript: (transcript) => {
      setDraft(previous => ({
        ...previous,
        text: previous.text.length > 0 ? `${previous.text} ${transcript}` : transcript,
      }));
    },
  });
  const saveEntry = useSaveEntry({
    editingEntry,
    draft,
    entries,
    showCustomEndTime,
    setValidationMessage,
  });
  React.useEffect(() => {
    setDraft(draftSeed);
    setValidationMessage(null);
    setShowCustomEndTime(false);
  }, [draftSeed]);

  return (
    <EntryForm
      editingEntry={editingEntry}
      draft={draft}
      autoEndValue={autoEndValue}
      validationMessage={validationMessage}
      dictation={dictation}
      setDraft={setDraft}
      showCustomEndTime={showCustomEndTime}
      setShowCustomEndTime={setShowCustomEndTime}
      onSave={saveEntry}
      onBack={() => router.back()}
    />
  );
}
