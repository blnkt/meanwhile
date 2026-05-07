import type { OptionType } from '@/components/ui';

import type { GradientPresetKey } from '@/features/journal/journal-day-gradient';
import * as React from 'react';
import { Options, useModal } from '@/components/ui';
import { useJournalStore } from '@/features/journal/use-journal-store';
import { translate } from '@/lib/i18n';

import { SettingsItem } from './settings-item';

const GRADIENT_PRESET_VALUES: GradientPresetKey[] = ['default', 'calm', 'forest', 'mono'];

export function JournalGradientItem() {
  const gradientPreset = useJournalStore.use.gradientPreset();
  const setGradientPreset = useJournalStore.use.setGradientPreset();
  const modal = useModal();

  const onSelect = React.useCallback(
    (option: OptionType) => {
      setGradientPreset(option.value as GradientPresetKey);
      modal.dismiss();
    },
    [setGradientPreset, modal],
  );

  const options = React.useMemo<OptionType[]>(
    () =>
      GRADIENT_PRESET_VALUES.map(value => ({
        value,
        label: translate(`settings.gradient.options.${value}`),
      })),
    [],
  );

  const selected = React.useMemo(
    () => options.find(option => option.value === gradientPreset),
    [gradientPreset, options],
  );

  return (
    <>
      <SettingsItem
        text="settings.gradient.title"
        value={selected?.label}
        onPress={modal.present}
      />
      <Options
        ref={modal.ref}
        options={options}
        onSelect={onSelect}
        value={selected?.value}
      />
    </>
  );
}
