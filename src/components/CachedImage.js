import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import {
  cacheImage,
  getCachedImageUri,
  isRemoteImage,
  peekCachedImageUri,
} from '../services/ImageCacheService';

// Drop-in for <Image source={{ uri }}> for remote images. Uses the on-disk copy
// when there is one (instant, works offline); otherwise shows the remote image
// and stores a copy in the background for next time.
export default function CachedImage({ uri, fallbackSource, style, onError, ...rest }) {
  const [source, setSource] = useState(() => (isRemoteImage(uri) ? peekCachedImageUri(uri) : uri) || null);

  useEffect(() => {
    let cancelled = false;

    if (!uri || !isRemoteImage(uri)) {
      setSource(uri || null);
      return undefined;
    }

    (async () => {
      const cached = await getCachedImageUri(uri);
      if (cancelled) return;

      if (cached) {
        setSource(cached);
        return;
      }

      setSource(uri);
      cacheImage(uri);
    })();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!uri && fallbackSource) {
    return <Image {...rest} source={fallbackSource} style={style} />;
  }

  if (!source) return <View style={style} />;

  return (
    <Image
      {...rest}
      source={{ uri: source }}
      style={style}
      onError={(event) => {
        // A damaged cached file falls back to the network copy.
        if (source !== uri && isRemoteImage(uri)) {
          setSource(uri);
          return;
        }
        if (fallbackSource) {
          setSource(null);
          return;
        }
        onError?.(event);
      }}
    />
  );
}
