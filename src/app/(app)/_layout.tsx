import { Tabs } from 'expo-router';
import * as React from 'react';

import {
  Home as HomeIcon,
  Settings as SettingsIcon,
} from '@/components/ui/icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarItemStyle: {
          justifyContent: 'center',
        },
        tabBarStyle: {
          height: 58,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
          tabBarButtonTestID: 'journal-tab',
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
          tabBarButtonTestID: 'settings-tab',
        }}
      />
      <Tabs.Screen name="day/[day-key]" options={{ href: null }} />
      <Tabs.Screen name="all-entries" options={{ href: null }} />
      <Tabs.Screen name="entry/new" options={{ href: null }} />
      <Tabs.Screen name="entry/[entry-id]" options={{ href: null }} />
    </Tabs>
  );
}
