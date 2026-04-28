import Env from 'env';

import {
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { translate } from '@/lib/i18n';
import { LanguageItem } from './components/language-item';
import { SettingsContainer } from './components/settings-container';
import { SettingsItem } from './components/settings-item';
import { ThemeItem } from './components/theme-item';

export function SettingsScreen() {
  return (
    <>
      <FocusAwareStatusBar />

      <ScrollView>
        <View className="flex-1 px-4 pt-16">
          <Text className="text-xl font-bold">
            {translate('settings.title')}
          </Text>
          <SettingsContainer title="settings.generale">
            <LanguageItem />
            <ThemeItem />
          </SettingsContainer>

          <SettingsContainer title="settings.about">
            <SettingsItem
              text="settings.app_name"
              value={Env.EXPO_PUBLIC_NAME}
            />
            <SettingsItem
              text="settings.version"
              value={Env.EXPO_PUBLIC_VERSION}
            />
          </SettingsContainer>

          {/*
            <SettingsContainer title="settings.support_us">
              <SettingsItem
                text="settings.share"
                icon={<Share color={iconColor} />}
                onPress={() => {}}
              />
              <SettingsItem
                text="settings.rate"
                icon={<Rate color={iconColor} />}
                onPress={() => {}}
              />
              <SettingsItem
                text="settings.support"
                icon={<Support color={iconColor} />}
                onPress={() => {}}
              />
            </SettingsContainer>

            <SettingsContainer title="settings.links">
              <SettingsItem text="settings.privacy" onPress={() => {}} />
              <SettingsItem text="settings.terms" onPress={() => {}} />
              <SettingsItem
                text="settings.github"
                icon={<Github color={iconColor} />}
                onPress={() => {}}
              />
              <SettingsItem
                text="settings.website"
                icon={<Website color={iconColor} />}
                onPress={() => {}}
              />
            </SettingsContainer>
          */}
        </View>
      </ScrollView>
    </>
  );
}
