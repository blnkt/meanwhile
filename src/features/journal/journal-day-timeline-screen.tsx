import type { LayoutChangeEvent } from 'react-native';

import type { TimelineBlock } from '@/features/journal/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Animated, Easing, useColorScheme } from 'react-native';

import { Button, FocusAwareStatusBar, Pressable, ScrollView, Text, View } from '@/components/ui';
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
  const startMs = new Date(block.startTime).getTime();
  const endMs = new Date(block.endTime).getTime();
  const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
  const durationHours = Math.floor(durationMinutes / 60);
  const remainingMinutes = durationMinutes % 60;
  const durationLabel = durationHours > 0
    ? remainingMinutes > 0
      ? `${durationHours}h ${remainingMinutes}m`
      : `${durationHours}h`
    : `${durationMinutes}m`;

  return (
    <View className="mb-3" onLayout={event => onMeasure(block.entryId, event)}>
      <Link href={`/entry/${block.entryId}`} asChild>
        <Pressable className="overflow-hidden rounded-xl border border-neutral-200/90 dark:border-neutral-700/90">
          <View className="bg-white/75 p-3 dark:bg-black/45">
            <Text className="font-semibold text-neutral-900 dark:text-neutral-50">
              {block.moodEmoji ? `${block.moodEmoji} ` : ''}
              {formatReadableTime(block.startTime)}
              {' '}
              -
              {' '}
              {formatReadableTime(block.endTime)}
            </Text>
            <Text className="mt-1 text-xs tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
              {durationLabel}
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

type CardBounds = { bottom: number; top: number };
type GradientTuple = [number, number, ...number[]];
type ColorTuple = [string, string, ...string[]];
type GradientSpec = {
  colors: ColorTuple;
  locations: GradientTuple;
};

function hexToRgb(hex: string): { b: number; g: number; r: number } {
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value.split('').map(char => char + char).join('');
  }
  const parsed = Number.parseInt(value, 16);
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function blendHex(from: string, to: string, t: number): string {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const clamped = Math.min(1, Math.max(0, t));
  return rgbToHex(
    start.r + (end.r - start.r) * clamped,
    start.g + (end.g - start.g) * clamped,
    start.b + (end.b - start.b) * clamped,
  );
}

function getParentGradientColors(scheme: 'light' | 'dark'): ColorTuple {
  return scheme === 'dark'
    ? ['#0b1324', '#4a3320']
    : ['#d8e8ff', '#ffd8bd'];
}

function buildDurationWeightedGradientSpec(input: {
  blocks: TimelineBlock[];
  cardBoundsById: Record<string, CardBounds>;
  gradientHeight: number;
  parentGradientColors: ColorTuple;
}): GradientSpec | undefined {
  const {
    blocks,
    cardBoundsById,
    gradientHeight,
    parentGradientColors,
  } = input;
  if (gradientHeight <= 0 || blocks.length === 0) {
    return undefined;
  }

  const durations = blocks.map((block) => {
    const start = new Date(block.startTime).getTime();
    const end = new Date(block.endTime).getTime();
    return Math.max(1, end - start);
  });
  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
  if (totalDuration <= 0) {
    return undefined;
  }

  const points: Array<{ location: number; progress: number }> = [{ location: 0, progress: 0 }, { location: 1, progress: 1 }];
  let elapsedDuration = 0;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const bounds = cardBoundsById[block.entryId];
    const duration = durations[index];
    if (!bounds) {
      elapsedDuration += duration;
      continue;
    }

    const topProgress = elapsedDuration / totalDuration;
    elapsedDuration += duration;
    const bottomProgress = elapsedDuration / totalDuration;
    points.push(
      { location: bounds.top / gradientHeight, progress: topProgress },
      { location: bounds.bottom / gradientHeight, progress: bottomProgress },
    );
  }

  const sorted = points
    .map(point => ({
      location: Math.min(1, Math.max(0, point.location)),
      progress: Math.min(1, Math.max(0, point.progress)),
    }))
    .sort((a, b) => a.location - b.location);

  const deduped: Array<{ location: number; progress: number }> = [];
  for (const point of sorted) {
    const previous = deduped[deduped.length - 1];
    if (previous && Math.abs(previous.location - point.location) <= 0.0001) {
      previous.progress = Math.max(previous.progress, point.progress);
      continue;
    }
    deduped.push({ ...point });
  }

  for (let index = 1; index < deduped.length; index += 1) {
    deduped[index].progress = Math.max(deduped[index - 1].progress, deduped[index].progress);
  }

  const [from, to] = parentGradientColors;
  const locations = deduped.map(point => point.location);
  const colors = deduped.map(point => blendHex(from, to, point.progress));
  if (locations.length < 2 || colors.length < 2) {
    return undefined;
  }
  return {
    locations: locations as GradientTuple,
    colors: colors as ColorTuple,
  };
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

export function JournalDayTimelineScreen({ dayKeyOverride }: JournalDayTimelineScreenProps = {}) {
  const params = useLocalSearchParams<{ 'day-key': string; 'saved'?: string }>();
  const dayKey = dayKeyOverride ?? params['day-key'];
  const router = useRouter();
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

  const gradientSpec = React.useMemo(() => {
    return buildDurationWeightedGradientSpec({
      blocks,
      cardBoundsById,
      gradientHeight,
      parentGradientColors,
    });
  }, [blocks, cardBoundsById, gradientHeight, parentGradientColors]);

  return (
    <View className="flex-1 bg-white pt-14 dark:bg-black">
      <FocusAwareStatusBar />
      {showSavedToast
        ? (
            <View className="absolute inset-x-0 top-14 z-20 px-4">
              <SavedCheckInToast opacity={savedToastOpacity} translateY={savedToastTranslateY} />
            </View>
          )
        : null}
      <View className="mb-3 gap-2 px-4">
        <Text className="text-xl font-bold">
          {selectedGroup ? formatReadableDate(selectedGroup.dayKey) : translate('journal.day_timeline')}
        </Text>
        <View className="flex-row justify-end gap-2">
          <Link href="/all-entries" asChild>
            <Button label={translate('journal.all_entries')} size="sm" variant="outline" fullWidth={false} />
          </Link>
        </View>
      </View>

      <ScrollView className="flex-1">
        <LinearGradient
          colors={gradientSpec?.colors ?? parentGradientColors}
          end={{ x: 0, y: 1 }}
          locations={gradientSpec?.locations}
          onLayout={handleMeasureGradient}
          start={{ x: 0, y: 0 }}
          style={{ borderRadius: 12, padding: 12 }}
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
      </ScrollView>
      <View className="px-4 pt-2 pb-4">
        <Button
          label={translate('journal.add_entry')}
          onPress={() => router.push(`/entry/new?day-key=${dayKey}`)}
        />
      </View>
    </View>
  );
}
