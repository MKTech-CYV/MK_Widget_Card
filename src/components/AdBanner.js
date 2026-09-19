import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from '../services/AdMobService';

const RETRY_AFTER_FAILURE_MS = 60 * 1000;

// Inline anchored-adaptive banner placed inside a screen's content (not sticky).
// It is as wide as the screen (centred, so it bleeds through the screen's side
// padding) and has no rounded corners. It takes no space until an ad has loaded and collapses again after a failed
// load, retrying a minute later.
export default function AdBanner({ style }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const retryTimer = useRef(null);
  const { width } = useWindowDimensions();

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  if (!BANNER_AD_UNIT_ID || failed) return null;

  const handleFailed = () => {
    setFailed(true);
    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => {
      setFailed(false);
      setAttempt((value) => value + 1);
    }, RETRY_AFTER_FAILURE_MS);
  };

  return (
    <View style={[styles.slot, { width }, style]}>
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

const styles = StyleSheet.create({
  slot: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
});
