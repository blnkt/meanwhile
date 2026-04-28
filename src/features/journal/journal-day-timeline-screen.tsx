import { Link, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { Button, FocusAwareStatusBar, Pressable, ScrollView, Text, View } from '@/components/ui';
import { buildDayTimelineBlocks, formatReadableDate, formatReadableTime, groupEntriesByDay } from './journal-utils';
import { useJournalStore } from './use-journal-store';

export function JournalDayTimelineScreen() {
  const params = useLocalSearchParams<{ 'day-key': string }>();
  const entries = useJournalStore.use.entries();
  const dayGroups = React.useMemo(() => groupEntriesByDay(entries), [entries]);
  const selectedGroup = dayGroups.find(group => group.dayKey === params['day-key']);
  const blocks = React.useMemo(
    () => buildDayTimelineBlocks(selectedGroup?.entries ?? []),
    [selectedGroup?.entries],
  );

  return (
    <View className="flex-1 bg-white px-4 pt-14 dark:bg-black">
      <FocusAwareStatusBar />
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold">
          {selectedGroup ? formatReadableDate(selectedGroup.dayKey) : 'Day Timeline'}
        </Text>
        <View className="flex-row gap-2">
          <Link href="/entry/new" asChild>
            <Button label="New Entry" size="sm" fullWidth={false} />
          </Link>
          <Link href="/" asChild>
            <Button label="All Entries" size="sm" variant="outline" fullWidth={false} />
          </Link>
        </View>
      </View>

      <ScrollView className="flex-1">
        {!selectedGroup
          ? (
              <View className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <Text>Day not found.</Text>
              </View>
            )
          : (
              blocks.map((block) => {
                const startMs = new Date(block.startTime).getTime();
                const endMs = new Date(block.endTime).getTime();
                const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
                return (
                  <Link key={block.entryId} href={`/entry/${block.entryId}`} asChild>
                    <Pressable className="mb-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                      <Text className="font-semibold">
                        {block.moodEmoji}
                        {' '}
                        {formatReadableTime(block.startTime)}
                        {' '}
                        -
                        {' '}
                        {formatReadableTime(block.endTime)}
                      </Text>
                      <Text className="text-sm text-neutral-600 dark:text-neutral-300">
                        {durationMinutes}
                        {' '}
                        minute block
                      </Text>
                      <Text className="mt-2">{block.text || '(No text)'}</Text>
                    </Pressable>
                  </Link>
                );
              })
            )}
      </ScrollView>
    </View>
  );
}
