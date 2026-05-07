import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';

import { Animated, Easing, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  FocusAwareStatusBar,
  SafeAreaView,
  ScrollView,
  Text,
  TranslucentSurface,
  View as UIView,
} from '@/components/ui';
import {
  buildDurationWeightedGradientSpec,
  getParentGradientColorsForPreset,
} from '@/features/journal/journal-day-gradient';
import {
  DayScreenTitle,
  JournalDayTimelineScrollBody,
} from '@/features/journal/journal-day-timeline-scroll-body';
import {
  buildDayTimelineBlocks,
  buildSevenDayInsight,
  formatReadableDate,
  getTodayKey,
  groupEntriesByDay,
} from '@/features/journal/journal-utils';
import { useDayTimelineGradientMeasurements } from '@/features/journal/use-day-timeline-gradient-measurements';
import { useJournalStore } from '@/features/journal/use-journal-store';
import { translate } from '@/lib/i18n';

type JournalDayTimelineScreenProps = {
  dayKeyOverride?: string;
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

function resolveDayTitle(dayKey: string, selectedDayKey: string | undefined, todayKey: string) {
  if (dayKey === todayKey) {
    return 'Today';
  }
  if (selectedDayKey) {
    return formatReadableDate(selectedDayKey);
  }
  return translate('journal.day_timeline');
}

function FooterCta({
  dayKey,
  tabBarHeight,
  onMeasured,
}: {
  dayKey: string;
  tabBarHeight: number;
  onMeasured: (height: number) => void;
}) {
  const router = useRouter();

  return (
    <TranslucentSurface
      className="px-4 py-2"
      onLayout={(event) => {
        const nextHeight = event.nativeEvent.layout.height;
        onMeasured(nextHeight);
      }}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: tabBarHeight,
      }}
    >
      <Button
        label={translate('journal.add_entry')}
        onPress={() => router.push(`/entry/new?day-key=${dayKey}`)}
      />
    </TranslucentSurface>
  );
}

export function JournalDayTimelineScreen({ dayKeyOverride }: JournalDayTimelineScreenProps = {}) {
  const params = useLocalSearchParams<{ 'day-key': string; 'saved'?: string }>();
  const dayKey = dayKeyOverride ?? params['day-key'];
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const colorScheme = useColorScheme();
  const sliceScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const gradientPreset = useJournalStore.use.gradientPreset();
  const parentGradientColors = React.useMemo(
    () => getParentGradientColorsForPreset(sliceScheme, gradientPreset),
    [gradientPreset, sliceScheme],
  );
  const entries = useJournalStore.use.entries();
  const todayKey = getTodayKey();
  const insight = React.useMemo(() => buildSevenDayInsight(entries), [entries]);
  const dayGroups = React.useMemo(() => groupEntriesByDay(entries), [entries]);
  const selectedGroup = dayGroups.find(group => group.dayKey === dayKey);
  const blocks = React.useMemo(
    () => buildDayTimelineBlocks(selectedGroup?.entries ?? []),
    [selectedGroup?.entries],
  );
  const gradientBackdropRef = React.useRef<View | null>(null);
  const { gradientHeight, cardBoundsById, handleMeasureGradient, setCardRef, onScroll } = useDayTimelineGradientMeasurements(
    blocks,
    gradientBackdropRef,
  );
  const { showSavedToast, savedToastOpacity, savedToastTranslateY } = useSavedToast(params.saved);
  const [footerCtaHeight, setFooterCtaHeight] = React.useState(0);

  const dayTitle = resolveDayTitle(dayKey, selectedGroup?.dayKey, todayKey);

  const cardBoundsForGradient = React.useMemo(() => {
    const allowedIds = new Set(blocks.map(block => block.entryId));
    return Object.fromEntries(
      Object.entries(cardBoundsById).filter(([entryId]) => allowedIds.has(entryId)),
    );
  }, [blocks, cardBoundsById]);

  const gradientSpec = React.useMemo(() => {
    return buildDurationWeightedGradientSpec({
      blocks,
      cardBoundsById: cardBoundsForGradient,
      gradientHeight,
      parentGradientColors,
    });
  }, [blocks, cardBoundsForGradient, gradientHeight, parentGradientColors]);

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top']}
      style={styles.fill}
    >
      <View
        ref={gradientBackdropRef}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        onLayout={handleMeasureGradient}
      >
        <LinearGradient
          colors={gradientSpec?.colors ?? parentGradientColors}
          end={{ x: 0, y: 1 }}
          locations={gradientSpec?.locations}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <FocusAwareStatusBar />
      {showSavedToast
        ? (
            <UIView
              className="absolute inset-x-0 z-20 px-4"
              style={{ top: insets.top + 8 }}
            >
              <SavedCheckInToast opacity={savedToastOpacity} translateY={savedToastTranslateY} />
            </UIView>
          )
        : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerCtaHeight + tabBarHeight + 16 }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.fill}
      >
        <DayScreenTitle title={dayTitle} />
        <JournalDayTimelineScrollBody
          blocks={blocks}
          insight={insight}
          selectedGroup={selectedGroup}
          setCardRef={setCardRef}
        />
      </ScrollView>

      <FooterCta
        dayKey={dayKey}
        tabBarHeight={tabBarHeight}
        onMeasured={height =>
          setFooterCtaHeight(previous => (Math.abs(previous - height) < 0.5 ? previous : height))}
      />
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
