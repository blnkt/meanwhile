import type { View } from 'react-native';
import type { SevenDayInsight } from '@/features/journal/journal-utils';

import type { JournalEntry, TimelineBlock } from '@/features/journal/types';
import { Link } from 'expo-router';
import { Pressable, Text, View as UIView } from '@/components/ui';
import { formatReadableTime } from '@/features/journal/journal-utils';
import { translate } from '@/lib/i18n';

type DayGroup = { dayKey: string; entries: JournalEntry[] };

type DayEntryCardProps = {
  block: TimelineBlock;
  setCardRef: (entryId: string, node: View | null) => void;
};

function DayEntryCard({ block, setCardRef }: DayEntryCardProps) {
  return (
    <UIView className="mb-3" ref={node => setCardRef(block.entryId, node)}>
      <Link href={`/entry/${block.entryId}`} asChild>
        <Pressable className="overflow-hidden rounded-xl border border-neutral-200/90 dark:border-neutral-700/90">
          <UIView className="bg-white/75 p-3 dark:bg-black/45">
            <Text className="font-semibold text-neutral-900 dark:text-neutral-50">
              {formatReadableTime(block.startTime)}
              {block.moodEmoji ? ` ${block.moodEmoji}` : ''}
            </Text>
            <Text numberOfLines={4} className="mt-2 text-neutral-800 dark:text-neutral-100">
              {block.text || translate('journal.no_text')}
            </Text>
          </UIView>
        </Pressable>
      </Link>
    </UIView>
  );
}

function LastSevenDaysCard({ insight }: { insight: SevenDayInsight }) {
  return (
    <UIView className="mx-4 mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <Text className="font-semibold">{translate('journal.insight.last_7_days')}</Text>
      <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        {translate('journal.insight.line1', {
          count: insight.entryCount,
          peak: translate(`journal.insight.window.${insight.busiestWindowKey}`),
        })}
      </Text>
      <Text className="text-sm text-neutral-600 dark:text-neutral-300">
        {translate('journal.insight.line2', {
          moods: insight.topMoods.join(' ') || translate('journal.insight.no_moods'),
          trend: translate(`journal.insight.trend.${insight.trendDirection}`, {
            count: insight.trendDelta,
          }),
        })}
      </Text>
    </UIView>
  );
}

function DayScreenTitle({ title }: { title: string }) {
  return (
    <UIView className="px-4 pt-5 pb-3">
      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{title}</Text>
    </UIView>
  );
}

type JournalDayTimelineScrollBodyProps = {
  selectedGroup: DayGroup | undefined;
  blocks: TimelineBlock[];
  insight: SevenDayInsight;
  setCardRef: (entryId: string, node: View | null) => void;
};

export { DayScreenTitle };

export function JournalDayTimelineScrollBody({
  selectedGroup,
  blocks,
  insight,
  setCardRef,
}: JournalDayTimelineScrollBodyProps) {
  return (
    <UIView>
      {!selectedGroup
        ? (
            <UIView className="mx-4 mt-1 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <Text>{translate('journal.day_not_found')}</Text>
            </UIView>
          )
        : (
            <UIView className="mt-1 px-4">
              {blocks.map(block => (
                <DayEntryCard
                  key={block.entryId}
                  block={block}
                  setCardRef={setCardRef}
                />
              ))}
            </UIView>
          )}
      <LastSevenDaysCard insight={insight} />
    </UIView>
  );
}
