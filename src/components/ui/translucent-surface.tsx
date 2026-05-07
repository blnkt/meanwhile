import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import * as React from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

type TranslucentSurfaceProps = {
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  overlayOpacity?: number;
} & ViewProps;

export function TranslucentSurface({
  children,
  className,
  style,
  intensity = 40,
  overlayOpacity = 0.28,
  ...viewProps
}: TranslucentSurfaceProps) {
  const scheme = useColorScheme();
  const tint = scheme === 'dark' ? 'dark' : 'light';
  const normalizedOpacity = Math.min(1, Math.max(0, overlayOpacity));
  const overlay = scheme === 'dark'
    ? `rgba(0,0,0,${normalizedOpacity})`
    : `rgba(255,255,255,${normalizedOpacity})`;

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
