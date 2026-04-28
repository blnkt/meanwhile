import { JournalDayTimelineScreen } from '@/features/journal/journal-day-timeline-screen';
import { getTodayKey } from '@/features/journal/journal-utils';

export default function IndexScreen() {
  return <JournalDayTimelineScreen dayKeyOverride={getTodayKey()} />;
}
