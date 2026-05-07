import type { SvgProps } from 'react-native-svg';
import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

export function Moments({ color = '#000', ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M6 3.6A2.4 2.4 0 0 0 3.6 6v8.4A2.4 2.4 0 0 0 6 16.8h8.4a2.4 2.4 0 0 0 2.4-2.4V6a2.4 2.4 0 0 0-2.4-2.4H6Zm1.2 3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm10.2 1.8A2.4 2.4 0 0 1 19.8 6h.6A2.4 2.4 0 0 1 22.8 8.4v8.4a2.4 2.4 0 0 1-2.4 2.4H12a2.4 2.4 0 0 1-2.4-2.4v-.6h4.8a3.6 3.6 0 0 0 3.6-3.6V8.4Z"
        fill={color}
      />
    </Svg>
  );
}
