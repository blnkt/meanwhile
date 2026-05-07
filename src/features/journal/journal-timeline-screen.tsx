import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import {
  Button,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TranslucentSurface,
  View,
} from '@/components/ui';
import { getParentGradientColorsForPreset } from '@/features/journal/journal-day-gradient';
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

function buildCollapsedSummary(entries: { moodEmoji: string | null; startTime: string }[]) {
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
  const earliestStart = new Date(Math.min(...startTimes)).toISOString();
  const latestStart = new Date(Math.max(...startTimes)).toISOString();

  return translate('journal.timeline.collapsed_summary', {
    count: entryCount,
    moods: moodSummary,
    start: formatReadableTime(earliestStart),
    end: formatReadableTime(latestStart),
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
    <TranslucentSurface
      key={group.dayKey}
      overlayOpacity={0.4}
      className="mb-3 overflow-hidden rounded-xl border border-neutral-200/90 p-3 dark:border-neutral-700/90"
      intensity={52}
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
              <View key={entry.id} className="mb-2 overflow-hidden rounded-xl border border-neutral-200/90 dark:border-neutral-700/90">
                <Link href={`/entry/${entry.id}`} asChild>
                  <Pressable>
                    <View className="bg-white/75 p-3 dark:bg-black/45">
                      <Text className="font-medium">
                        {formatReadableTime(entry.startTime)}
                        {entry.moodEmoji ? ` ${entry.moodEmoji}` : ''}
                      </Text>
                      <Text numberOfLines={2} className="mt-1 text-neutral-700 dark:text-neutral-300">
                        {entry.text || translate('journal.no_text')}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              </View>
            ))
          )
        : (
            <Text className="text-sm text-neutral-600 dark:text-neutral-300">
              {collapsedSummary}
            </Text>
          )}
    </TranslucentSurface>
  );
}

export function JournalTimelineScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const colorScheme = useColorScheme();
  const sliceScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const gradientPreset = useJournalStore.use.gradientPreset();
  const parentGradientColors = React.useMemo(
    () => getParentGradientColorsForPreset(sliceScheme, gradientPreset),
    [gradientPreset, sliceScheme],
  );
  const [footerCtaHeight, setFooterCtaHeight] = React.useState(0);
  const entries = useJournalStore.use.entries();
  const collapsedDayKeys = useJournalStore.use.collapsedDayKeys();
  const toggleDayCollapsed = useJournalStore.use.toggleDayCollapsed();

  const dayGroups = React.useMemo(() => groupEntriesByDay(entries), [entries]);
  const todayKey = getTodayKey();
  const emptyPrompt = translate(getStablePrompt(todayKey));

  const scrollContentStyle = React.useMemo(
    () => [styles.scrollContent, { paddingBottom: footerCtaHeight + tabBarHeight + 16 }],
    [footerCtaHeight, tabBarHeight],
  );

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top']}
      style={[styles.fill, { backgroundColor: parentGradientColors[0] }]}
    >
      <FocusAwareStatusBar />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStyle}
        style={styles.fill}
      >
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {translate('journal.all_entries')}
          </Text>
        </View>

        <View className="mt-1 px-4">
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
        </View>
      </ScrollView>
      <TranslucentSurface
        className="px-4 py-2"
        onLayout={(event) => {
          const nextHeight = event.nativeEvent.layout.height;
          setFooterCtaHeight(previous => (Math.abs(previous - nextHeight) < 0.5 ? previous : nextHeight));
        }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: tabBarHeight,
        }}
      >
        <Button label={translate('journal.add_entry')} onPress={() => router.push('/entry/new')} />
      </TranslucentSurface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
