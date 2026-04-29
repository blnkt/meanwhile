import * as React from 'react';

import { Switch, Text, View } from '@/components/ui';
import { clearJournalFromICloud, syncJournalToICloud } from '@/features/journal/use-journal-store';
import { useICloudSyncSetting } from '@/lib/hooks/use-icloud-sync';
import { translate } from '@/lib/i18n';

export function ICloudSyncItem() {
  const { isEnabled, isSupported, setICloudEnabled } = useICloudSyncSetting();

  const handleToggle = React.useCallback((nextEnabled: boolean) => {
    setICloudEnabled(nextEnabled);
    if (nextEnabled) {
      syncJournalToICloud();
      return;
    }
    void clearJournalFromICloud();
  }, [setICloudEnabled]);

  return (
    <View className="px-4 py-2">
      <View className="flex-row items-center justify-between">
        <Text tx="settings.icloud_sync" />
        <Switch
          checked={isEnabled && isSupported}
          disabled={!isSupported}
          onChange={handleToggle}
          accessibilityLabel={translate('settings.icloud_sync')}
        />
      </View>
      <Text className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
        {isSupported
          ? translate('settings.icloud_sync_description')
          : translate('settings.icloud_sync_unavailable')}
      </Text>
    </View>
  );
}
