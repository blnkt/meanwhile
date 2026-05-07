import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import * as React from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

type TranslucentSurfaceProps = {
  style?: StyleProp<ViewStyle>;
  intensity?: number;
} & ViewProps;

export function TranslucentSurface({
  children,
  className,
  style,
  intensity = 40,
  ...viewProps
}: TranslucentSurfaceProps) {
  const scheme = useColorScheme();
  const tint = scheme === 'dark' ? 'dark' : 'light';
  const overlay = scheme === 'dark' ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.28)';

  return (
    <View className={className} style={style} {...viewProps}>
      <BlurView intensity={intensity} style={StyleSheet.absoluteFill} tint={tint} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]}
      />
      {children}
    </View>
  );
}
