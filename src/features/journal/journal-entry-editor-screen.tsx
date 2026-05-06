import type { JournalEntry } from './types';
import type { TxKeyPath } from '@/lib/i18n';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Platform, TextInput } from 'react-native';

import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
  Button,
  FocusAwareStatusBar,
  Input,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { translate } from '@/lib/i18n';
import { formatJournalDateTimeDisplay } from './journal-formatters';
import {
  formatDateTimeInputValue,
  formatReadableTime,
  parseDateTimeInput,
  toDayKey,
} from './journal-utils';
import { useJournalStore } from './use-journal-store';

const MOOD_OPTIONS = ['😀', '🙂', '😐', '😔', '😤', '😍'];
const INTERSTITIAL_PROMPT_KEYS: TxKeyPath[] = [
  'journal.prompts.finished',
  'journal.prompts.next_step',
  'journal.prompts.energy',
];

function getStablePrompt(seedValue: string): TxKeyPath {
  const seed = [...seedValue].reduce((total, char) => total + char.charCodeAt(0), 0);
  return INTERSTITIAL_PROMPT_KEYS[seed % INTERSTITIAL_PROMPT_KEYS.length];
}

type EntryDraft = {
  moodEmoji: string | null;
  text: string;
  startValue: string;
};

function buildInitialDraft(
  entry: JournalEntry | undefined,
  dayKeyOverride?: string,
): EntryDraft {
  const now = new Date();
  if (dayKeyOverride && !entry) {
    const [year, month, day] = dayKeyOverride.split('-').map(part => Number.parseInt(part, 10));
    if ([year, month, day].every(Number.isFinite)) {
      now.setFullYear(year, month - 1, day);
    }
  }
  const nowIso = now.toISOString();
  const startTime = entry?.startTime ?? nowIso;
  return {
    moodEmoji: entry?.moodEmoji ?? null,
    text: entry?.text ?? '',
    startValue: formatDateTimeInputValue(startTime),
  };
}

function MoodPicker({
  selectedMood,
  onSelect,
}: {
  selectedMood: string | null;
  onSelect: (mood: string | null) => void;
}) {
  return (
    <View className="mt-2 mb-3">
      <Text className="mb-1 font-semibold">{translate('journal.mood')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2 pr-2">
          {MOOD_OPTIONS.map(option => (
            <Button
              key={option}
              label={option}
              size="sm"
              fullWidth={false}
              variant={selectedMood === option ? 'default' : 'outline'}
              onPress={() => onSelect(selectedMood === option ? null : option)}
            />
          ))}
        </View>
      </ScrollView>
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
  const displayValue = formatJournalDateTimeDisplay(pickerDate.toISOString());
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
  validationMessage: string | null;
  setDraft: React.Dispatch<React.SetStateAction<EntryDraft>>;
  onSave: () => void;
  onSaveAndAddAnother: () => void;
  onBack: () => void;
};

type TimeSectionProps = {
  draft: EntryDraft;
  activePicker: 'start' | null;
  isTimeSectionExpanded: boolean;
  setIsTimeSectionExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setActivePicker: React.Dispatch<React.SetStateAction<'start' | null>>;
  setDraft: React.Dispatch<React.SetStateAction<EntryDraft>>;
};

function TimeSection({
  draft,
  activePicker,
  isTimeSectionExpanded,
  setIsTimeSectionExpanded,
  setActivePicker,
  setDraft,
}: TimeSectionProps) {
  return (
    <View className="mb-2 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
      <Pressable
        className="flex-row items-center justify-between"
        onPress={() => setIsTimeSectionExpanded(previous => !previous)}
      >
        <Text className="font-semibold">{translate('journal.time_details')}</Text>
        <Text className="font-medium text-primary-600 underline dark:text-primary-300">
          {isTimeSectionExpanded ? translate('journal.hide_details') : translate('journal.show_details')}
        </Text>
      </Pressable>
      <Text className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
        {translate('journal.start_time')}
        {' '}
        {draft.startValue}
      </Text>

      {isTimeSectionExpanded
        ? (
            <View className="mt-2">
              <DateTimeField
                label={translate('journal.start_time_label')}
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
            </View>
          )
        : null}
    </View>
  );
}

function StartTimePreview({ startValue }: { startValue: string }) {
  return (
    <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
      {translate('journal.current_start_preview')}
      {' '}
      {formatReadableTime(parseDateTimeInput(startValue) ?? new Date().toISOString())}
    </Text>
  );
}

function EntryForm({
  editingEntry,
  draft,
  validationMessage,
  setDraft,
  onSave,
  onSaveAndAddAnother,
  onBack,
}: EntryFormProps) {
  const [activePicker, setActivePicker] = React.useState<'start' | null>(null);
  const [isTimeSectionExpanded, setIsTimeSectionExpanded] = React.useState(false);
  const prompt = React.useMemo(
    () => translate(getStablePrompt(draft.startValue)),
    [draft.startValue],
  );

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <FocusAwareStatusBar />
      <ScrollView className="flex-1 px-4 pt-14">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[28px] font-bold">
            {editingEntry ? translate('journal.save_changes') : translate('journal.new_entry')}
          </Text>
          <Button
            label={translate('journal.back')}
            size="sm"
            variant="outline"
            fullWidth={false}
            onPress={onBack}
          />
        </View>

        <Text className="mt-1 mb-2 text-sm text-neutral-600 dark:text-neutral-300">{prompt}</Text>

        <MoodPicker
          selectedMood={draft.moodEmoji}
          onSelect={moodEmoji =>
            setDraft(previous => ({
              ...previous,
              moodEmoji,
            }))}
        />

        <Text className="my-1 font-semibold">{translate('journal.quick_note')}</Text>
        <TextInput
          className="mb-3 min-h-[120px] rounded-xl border border-neutral-300 bg-neutral-100 p-3 text-base text-black dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          returnKeyType="done"
          multiline
          textAlignVertical="top"
          value={draft.text}
          onChangeText={text =>
            setDraft(previous => ({
              ...previous,
              text,
            }))}
          placeholder={prompt || translate('journal.entry_text_placeholder')}
          placeholderTextColor="#9ca3af"
        />

        <TimeSection
          draft={draft}
          activePicker={activePicker}
          isTimeSectionExpanded={isTimeSectionExpanded}
          setIsTimeSectionExpanded={setIsTimeSectionExpanded}
          setActivePicker={setActivePicker}
          setDraft={setDraft}
        />

        <StartTimePreview startValue={draft.startValue} />

        {validationMessage
          ? (
              <Text className="mt-2 text-red-500">{validationMessage}</Text>
            )
          : null}

        <View className="mt-5 mb-8 gap-2">
          <Button
            label={editingEntry ? translate('journal.save_changes') : translate('journal.create_entry')}
            onPress={onSave}
          />
          <Button
            label={translate('journal.save_and_add_another')}
            variant="outline"
            onPress={onSaveAndAddAnother}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function useSaveEntry({
  editingEntry,
  draft,
  setValidationMessage,
}: {
  editingEntry: JournalEntry | undefined;
  draft: EntryDraft;
  setValidationMessage: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const router = useRouter();
  const createEntry = useJournalStore.use.createEntry();
  const updateEntry = useJournalStore.use.updateEntry();

  return React.useCallback((mode: 'save' | 'save-and-add-another' = 'save') => {
    const trimmedText = draft.text.trim();
    const hasMood = Boolean(draft.moodEmoji);
    const hasText = trimmedText.length > 0;
    if (!hasMood && !hasText) {
      setValidationMessage(translate('journal.error_require_content'));
      return;
    }

    const start = parseDateTimeInput(draft.startValue);
    if (!start) {
      setValidationMessage(translate('journal.error_choose_start'));
      return;
    }
    setValidationMessage(null);

    if (editingEntry) {
      updateEntry(editingEntry.id, {
        moodEmoji: draft.moodEmoji,
        text: trimmedText,
        startTime: start,
      });
    }
    else {
      createEntry({
        moodEmoji: draft.moodEmoji,
        text: trimmedText,
        startTime: start,
      });
    }
    const dayKey = toDayKey(start);
    if (mode === 'save-and-add-another') {
      router.replace(`/entry/new?day-key=${dayKey}`);
      return;
    }
    router.replace(`/day/${dayKey}?saved=1`);
  }, [createEntry, draft.moodEmoji, draft.startValue, draft.text, editingEntry, router, setValidationMessage, updateEntry]);
}

export function JournalEntryEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 'day-key'?: string; 'entry-id'?: string }>();
  const entries = useJournalStore.use.entries();
  const editingEntry = entries.find(entry => entry.id === params['entry-id']);
  const dayKeyParam = params['day-key'];
  const draftSeed = React.useMemo(
    () => buildInitialDraft(editingEntry, dayKeyParam),
    [dayKeyParam, editingEntry],
  );
  const [draft, setDraft] = React.useState(() => draftSeed);
  const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
  const saveEntry = useSaveEntry({
    editingEntry,
    draft,
    setValidationMessage,
  });
  React.useEffect(() => {
    setDraft(draftSeed);
    setValidationMessage(null);
  }, [draftSeed, editingEntry]);

  return (
    <EntryForm
      editingEntry={editingEntry}
      draft={draft}
      validationMessage={validationMessage}
      setDraft={setDraft}
      onSave={() => saveEntry('save')}
      onSaveAndAddAnother={() => saveEntry('save-and-add-another')}
      onBack={() => router.back()}
    />
  );
}
