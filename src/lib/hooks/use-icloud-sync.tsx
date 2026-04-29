import * as React from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';

import {
  isICloudSyncSupported,
  setICloudSyncEnabled,
} from '@/lib/icloud-sync';
import { storage } from '@/lib/storage';

const ICLOUD_SYNC_ENABLED_KEY = 'ICLOUD_SYNC_ENABLED';

export function useICloudSyncSetting() {
  const [enabled, setEnabled] = useMMKVBoolean(ICLOUD_SYNC_ENABLED_KEY, storage);
  const isSupported = isICloudSyncSupported();

  const setICloudEnabled = React.useCallback((nextEnabled: boolean) => {
    setICloudSyncEnabled(nextEnabled);
    setEnabled(nextEnabled);
  }, [setEnabled]);

  return {
    isSupported,
    isEnabled: enabled ?? false,
    setICloudEnabled,
  } as const;
}
