import type { LayoutChangeEvent } from 'react-native';

import type { CardBounds } from '@/features/journal/journal-day-gradient';
import type { TimelineBlock } from '@/features/journal/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';

import { Animated, Easing, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, FocusAwareStatusBar, Pressable, SafeAreaView, ScrollView, Text, View } from '@/components/ui';
import {
  buildDurationWeightedGradientSpec,
  getParentGradientColors,
} from '@/features/journal/journal-day-gradient';
import {
  buildDayTimelineBlocks,
  buildSevenDayInsight,
  formatReadableDate,
  formatReadableTime,
  groupEntriesByDay,
} from '@/features/journal/journal-utils';
import { useJournalStore } from '@/features/journal/use-journal-store';
import { translate } from '@/lib/i18n';

type JournalDayTimelineScreenProps = {
  dayKeyOverride?: string;
};

type DayEntryCardProps = {
  block: TimelineBlock;
  onMeasure: (entryId: string, event: LayoutChangeEvent) => void;
};

function SavedCheckInToast({
  opacity,
  translateY,
}: {
  opacity: Animated.Value;
  translateY: Animated.Value;
}) {
  return (
    <Animated.View
      className="rounded-xl border border-emerald-300 bg-emerald-100 px-3 py-2 dark:border-emerald-700 dark:bg-emerald-950/60"
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <Text className="text-emerald-800 dark:text-emerald-200">{translate('journal.saved_checkin')}</Text>
    </Animated.View>
  );
}

function LastSevenDaysCard({ insight }: { insight: ReturnType<typeof buildSevenDayInsight> }) {
  return (
    <View className="mx-4 mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
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
    </View>
  );
}

function DayEntryCard({ block, onMeasure }: DayEntryCardProps) {
  return (
    <View className="mb-3" onLayout={event => onMeasure(block.entryId, event)}>
      <Link href={`/entry/${block.entryId}`} asChild>
        <Pressable className="overflow-hidden rounded-xl border border-neutral-200/90 dark:border-neutral-700/90">
          <View className="bg-white/75 p-3 dark:bg-black/45">
            <Text className="font-semibold text-neutral-900 dark:text-neutral-50">
              {formatReadableTime(block.startTime)}
              {block.moodEmoji ? ` ${block.moodEmoji}` : ''}
            </Text>
            <Text numberOfLines={4} className="mt-2 text-neutral-800 dark:text-neutral-100">
              {block.text || translate('journal.no_text')}
            </Text>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

function useCardMeasurements(blocks: TimelineBlock[]) {
  const [gradientHeight, setGradientHeight] = React.useState(0);
  const [cardBoundsById, setCardBoundsById] = React.useState<Record<string, CardBounds>>({});

  React.useEffect(() => {
    const allowedIds = new Set(blocks.map(block => block.entryId));
    setCardBoundsById((previous) => {
      const nextEntries = Object.entries(previous).filter(([entryId]) => allowedIds.has(entryId));
      if (nextEntries.length === Object.keys(previous).length) {
        return previous;
      }
      return Object.fromEntries(nextEntries);
    });
  }, [blocks]);

  const handleMeasureCard = React.useCallback((entryId: string, event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    const nextBounds: CardBounds = { top: y, bottom: y + height };
    setCardBoundsById((previous) => {
      const current = previous[entryId];
      if (
        current
        && Math.abs(current.top - nextBounds.top) < 0.5
        && Math.abs(current.bottom - nextBounds.bottom) < 0.5
      ) {
        return previous;
      }
      return {
        ...previous,
        [entryId]: nextBounds,
      };
    });
  }, []);

  const handleMeasureGradient = React.useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setGradientHeight(previous => (Math.abs(previous - nextHeight) < 0.5 ? previous : nextHeight));
  }, []);

  return { gradientHeight, cardBoundsById, handleMeasureCard, handleMeasureGradient };
}

function useSavedToast(savedFlag: string | undefined) {
  const showSavedToast = savedFlag === '1';
  const savedToastOpacity = React.useRef(new Animated.Value(savedFlag === '1' ? 1 : 0)).current;
  const savedToastTranslateY = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (savedFlag !== '1') {
      savedToastOpacity.setValue(0);
      savedToastTranslateY.setValue(0);
      return;
    }

    savedToastOpacity.setValue(1);
    savedToastTranslateY.setValue(0);

    const timeoutId = setTimeout(() => {
      Animated.parallel([
        Animated.timing(savedToastOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(savedToastTranslateY, {
          toValue: -8,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [savedFlag, savedToastOpacity, savedToastTranslateY]);

  return { showSavedToast, savedToastOpacity, savedToastTranslateY };
}

function DayScreenTitle({ title }: { title: string }) {
  return (
    <View className="px-4 pt-4 pb-2">
      <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{title}</Text>
    </View>
  );
}

function DayHeaderActions() {
  return (
    <View className="flex-row justify-end border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-black">
      <Link href="/all-entries" asChild>
        <Button label={translate('journal.all_entries')} size="sm" variant="outline" fullWidth={false} />
      </Link>
    </View>
  );
}

export function JournalDayTimelineScreen({ dayKeyOverride }: JournalDayTimelineScreenProps = {}) {
  const params = useLocalSearchParams<{ 'day-key': string; 'saved'?: string }>();
  const dayKey = dayKeyOverride ?? params['day-key'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const sliceScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const parentGradientColors = React.useMemo(
    () => getParentGradientColors(sliceScheme),
    [sliceScheme],
  );
  const entries = useJournalStore.use.entries();
  const insight = React.useMemo(() => buildSevenDayInsight(entries), [entries]);
  const dayGroups = React.useMemo(() => groupEntriesByDay(entries), [entries]);
  const selectedGroup = dayGroups.find(group => group.dayKey === dayKey);
  const blocks = React.useMemo(
    () => buildDayTimelineBlocks(selectedGroup?.entries ?? []),
    [selectedGroup?.entries],
  );
  const { gradientHeight, cardBoundsById, handleMeasureCard, handleMeasureGradient } = useCardMeasurements(blocks);
  const { showSavedToast, savedToastOpacity, savedToastTranslateY } = useSavedToast(params.saved);

  const dayTitle = selectedGroup
    ? formatReadableDate(selectedGroup.dayKey)
    : translate('journal.day_timeline');

  const gradientSpec = React.useMemo(() => {
    return buildDurationWeightedGradientSpec({
      blocks,
      cardBoundsById,
      gradientHeight,
      parentGradientColors,
    });
  }, [blocks, cardBoundsById, gradientHeight, parentGradientColors]);

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-black"
      edges={['top']}
      style={styles.fill}
    >
      <FocusAwareStatusBar />
      {showSavedToast
        ? (
            <View
              className="absolute inset-x-0 z-20 px-4"
              style={{ top: insets.top + 8 }}
            >
              <SavedCheckInToast opacity={savedToastOpacity} translateY={savedToastTranslateY} />
            </View>
          )
        : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
        style={styles.fill}
      >
        <DayScreenTitle title={dayTitle} />
        <DayHeaderActions />

        <View>
          <LinearGradient
            colors={gradientSpec?.colors ?? parentGradientColors}
            end={{ x: 0, y: 1 }}
            locations={gradientSpec?.locations}
            onLayout={handleMeasureGradient}
            start={{ x: 0, y: 0 }}
            style={{ borderRadius: 12, marginHorizontal: 16, padding: 12 }}
          >
            {!selectedGroup
              ? (
                  <View className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <Text>{translate('journal.day_not_found')}</Text>
                  </View>
                )
              : (
                  blocks.map(block => (
                    <DayEntryCard
                      key={block.entryId}
                      block={block}
                      onMeasure={handleMeasureCard}
                    />
                  ))
                )}
          </LinearGradient>
          <LastSevenDaysCard insight={insight} />
        </View>
      </ScrollView>

      <View className="px-4 pt-2 pb-4">
        <Button
          label={translate('journal.add_entry')}
          onPress={() => router.push(`/entry/new?day-key=${dayKey}`)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
});
