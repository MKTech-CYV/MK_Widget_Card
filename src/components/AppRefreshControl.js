import React from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppRefreshControl({
  tintColor,
  colors,
  offset = 56,
  progressViewOffset,
  ...props
}) {
  const insets = useSafeAreaInsets();
  const resolvedOffset = progressViewOffset ?? insets.top + offset;

  return (
    <RefreshControl
      {...props}
      tintColor={tintColor}
      colors={colors || (tintColor ? [tintColor] : undefined)}
      progressViewOffset={resolvedOffset}
    />
  );
}
