import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from '../services/AdMobService';

const RETRY_AFTER_FAILURE_MS = 60 * 1000;

// Anchored adaptive banner. It collapses to nothing until an ad has loaded (and
// after a failed load), so screens never show an empty strip. `hidden` keeps the
// view mounted (no new ad request when switching back) but takes no space.
export default function AdBanner({ hidden = false, style }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const retryTimer = useRef(null);

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  if (!BANNER_AD_UNIT_ID) return null;

  const handleFailed = () => {
    setFailed(true);
    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => {
      setFailed(false);
      setAttempt((value) => value + 1);
    }, RETRY_AFTER_FAILURE_MS);
  };

  if (failed) return null;

  return (
    <View style={hidden ? { height: 0, overflow: 'hidden' } : style} pointerEvents={hidden ? 'none' : 'auto'}>
      <BannerAd
        key={attempt}
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={handleFailed}
      />
    </View>
  );
}
