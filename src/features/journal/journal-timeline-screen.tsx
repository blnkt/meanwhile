import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { Button, FocusAwareStatusBar, Pressable, ScrollView, Text, View } from '@/components/ui';
import { translate } from '@/lib/i18n';
import { formatReadableDate, formatReadableTime, getTodayKey, groupEntriesByDay } from './journal-utils';
import { useJournalStore } from './use-journal-store';

const INTERSTITIAL_EMPTY_PROMPT_KEYS = [
  'journal.prompts.finished',
  'journal.prompts.next_step',
  'journal.prompts.energy',
] as const;

function getStablePrompt(dayKey: string) {
  const seed = dayKey.split('-').reduce((total, part) => total + Number.parseInt(part, 10), 0);
  return INTERSTITIAL_EMPTY_PROMPT_KEYS[seed % INTERSTITIAL_EMPTY_PROMPT_KEYS.length];
}

function buildCollapsedSummary(entries: { moodEmoji: string | null; startTime: string; endTime: string }[]) {
  const entryCount = entries.length;
  const moodCountMap = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.moodEmoji) {
      continue;
    }
    moodCountMap.set(entry.moodEmoji, (moodCountMap.get(entry.moodEmoji) ?? 0) + 1);
  }
  const topMoods = [...moodCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mood]) => mood)
    .join('');
  const moodSummary = topMoods || translate('journal.no_moods_logged');

  const startTimes = entries.map(entry => new Date(entry.startTime).getTime());
  const endTimes = entries.map(entry => new Date(entry.endTime).getTime());
  const earliestStart = new Date(Math.min(...startTimes)).toISOString();
  const latestEnd = new Date(Math.max(...endTimes)).toISOString();

  return translate('journal.timeline.collapsed_summary', {
    count: entryCount,
    moods: moodSummary,
    start: formatReadableTime(earliestStart),
    end: formatReadableTime(latestEnd),
  });
}

function splitReadableDate(dayKey: string) {
  const full = formatReadableDate(dayKey);
  const parts = full.split(', ');
  const dayName = parts[0] ?? full;
  const rest = parts.slice(1).join(', ') || full;
  return { dayName, rest };
}

function EmptyStateCard({ prompt }: { prompt: string }) {
  return (
    <View className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <Text className="text-neutral-600 dark:text-neutral-300">
        {translate('journal.no_entries_yet')}
      </Text>
      <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {translate('journal.try_prompt_prefix')}
        {' '}
        {prompt}
      </Text>
    </View>
  );
}

function DayGroupCard({
  group,
  isCollapsed,
  onToggleCollapsed,
  onOpenDay,
}: {
  group: ReturnType<typeof groupEntriesByDay>[number];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenDay: () => void;
}) {
  const collapsedSummary = buildCollapsedSummary(group.entries);
  const { dayName, rest } = splitReadableDate(group.dayKey);
  return (
    <View
      key={group.dayKey}
      className="mb-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
    >
      <View className="mb-2 flex-row flex-wrap items-start justify-between gap-y-2">
        <View className="min-w-0 flex-1 pr-2">
          <Pressable onPress={onToggleCollapsed}>
            <View className="flex-row items-start">
              <Text className="w-5 font-semibold">{isCollapsed ? '▶' : '▼'}</Text>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-semibold">
                  {dayName}
                </Text>
                <Text numberOfLines={1} className="text-sm text-neutral-600 dark:text-neutral-300">
                  {rest}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
        <Button
          className="self-start"
          label={translate('journal.timeline.day_view')}
          size="sm"
          variant="outline"
          fullWidth={false}
          onPress={onOpenDay}
        />
      </View>
      {!isCollapsed
        ? (
            group.entries.map(entry => (
              <Link key={entry.id} href={`/entry/${entry.id}`} asChild>
                <Pressable className="mb-2 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-900">
                  <Text className="font-medium">
                    {entry.moodEmoji ? `${entry.moodEmoji} ` : ''}
                    {formatReadableTime(entry.startTime)}
                  </Text>
                  <Text numberOfLines={2} className="mt-1 text-neutral-700 dark:text-neutral-300">
                    {entry.text || translate('journal.no_text')}
                  </Text>
                </Pressable>
              </Link>
            ))
          )
        : (
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">
              {collapsedSummary}
            </Text>
          )}
    </View>
  );
}

export function JournalTimelineScreen() {
  const router = useRouter();
  const entries = useJournalStore.use.entries();
  const collapsedDayKeys = useJournalStore.use.collapsedDayKeys();
  const toggleDayCollapsed = useJournalStore.use.toggleDayCollapsed();

  const dayGroups = React.useMemo(() => groupEntriesByDay(entries), [entries]);
  const todayKey = getTodayKey();
  const hasTodayEntries = dayGroups.some(group => group.dayKey === todayKey);
  const emptyPrompt = translate(getStablePrompt(todayKey));

  return (
    <View className="flex-1 bg-white px-4 pt-14 dark:bg-black">
      <FocusAwareStatusBar />
      <View className="mb-3">
        <Text className="text-2xl font-bold">{translate('journal.all_entries')}</Text>
      </View>

      <Button
        label={hasTodayEntries ? translate('journal.today_cta') : translate('journal.start_today')}
        variant="outline"
        size="sm"
        onPress={() => {
          if (hasTodayEntries) {
            router.push(`/day/${todayKey}`);
            return;
          }
          router.push('/entry/new');
        }}
      />

      <ScrollView className="mt-2 flex-1">
        {dayGroups.length === 0
          ? <EmptyStateCard prompt={emptyPrompt} />
          : (
              dayGroups.map((group) => {
                const isCollapsed = collapsedDayKeys.includes(group.dayKey);
                return (
                  <DayGroupCard
                    key={group.dayKey}
                    group={group}
                    isCollapsed={isCollapsed}
                    onToggleCollapsed={() => toggleDayCollapsed(group.dayKey)}
                    onOpenDay={() => router.push(`/day/${group.dayKey}`)}
                  />
                );
              })
            )}
      </ScrollView>
      <View className="pt-2 pb-4">
        <Button label={translate('journal.add_entry')} onPress={() => router.push('/entry/new')} />
      </View>
    </View>
  );
}
