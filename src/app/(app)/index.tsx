import { Redirect } from 'expo-router';
import { getTodayKey } from '@/features/journal/journal-utils';

export default function IndexScreen() {
  return <Redirect href={`/day/${getTodayKey()}`} />;
}
