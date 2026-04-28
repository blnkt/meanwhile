import { Link, useRouter } from 'expo-router';
import * as React from 'react';
import { Button, FocusAwareStatusBar, Pressable, ScrollView, Text, View } from '@/components/ui';
import { formatReadableDate, formatReadableTime, getTodayKey, groupEntriesByDay } from './journal-utils';
import { useJournalStore } from './use-journal-store';

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
  const moodSummary = topMoods || 'No moods logged';

  const startTimes = entries.map(entry => new Date(entry.startTime).getTime());
  const endTimes = entries.map(entry => new Date(entry.endTime).getTime());
  const earliestStart = new Date(Math.min(...startTimes)).toISOString();
  const latestEnd = new Date(Math.max(...endTimes)).toISOString();

  return `${entryCount} entries • ${moodSummary} • ${formatReadableTime(earliestStart)} - ${formatReadableTime(latestEnd)}`;
}

export function JournalTimelineScreen() {
  const router = useRouter();
  const entries = useJournalStore.use.entries();
  const collapsedDayKeys = useJournalStore.use.collapsedDayKeys();
  const toggleDayCollapsed = useJournalStore.use.toggleDayCollapsed();

  const dayGroups = React.useMemo(() => groupEntriesByDay(entries), [entries]);
  const todayKey = getTodayKey();
  const hasTodayEntries = dayGroups.some(group => group.dayKey === todayKey);

  return (
    <View className="flex-1 bg-white px-4 pt-14 dark:bg-black">
      <FocusAwareStatusBar />
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-bold">Journal</Text>
        <Link href="/entry/new" asChild>
          <Button label="New Entry" size="sm" fullWidth={false} />
        </Link>
      </View>

      <Button
        label={hasTodayEntries ? 'Go to Today' : 'Start Today'}
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
          ? (
              <View className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <Text className="text-neutral-600 dark:text-neutral-300">
                  No entries yet. Create your first entry for today.
                </Text>
              </View>
            )
          : (
              dayGroups.map((group) => {
                const isCollapsed = collapsedDayKeys.includes(group.dayKey);
                const collapsedSummary = buildCollapsedSummary(group.entries);
                return (
                  <View
                    key={group.dayKey}
                    className="mb-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <View className="mb-2 flex-row items-center justify-between">
                      <Pressable onPress={() => toggleDayCollapsed(group.dayKey)}>
                        <Text className="font-semibold">
                          {isCollapsed ? '▶' : '▼'}
                          {' '}
                          {formatReadableDate(group.dayKey)}
                        </Text>
                      </Pressable>
                      <Button
                        label="Day View"
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        onPress={() => router.push(`/day/${group.dayKey}`)}
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
                                  {entry.text || '(No text)'}
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
              })
            )}
      </ScrollView>
    </View>
  );
}
