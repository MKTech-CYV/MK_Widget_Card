// Web Fallback: Google Mobile Ads SDK is native only (iOS & Android)
export const ADMOB_APP_ID = '';
export const APP_OPEN_AD_UNIT_ID = '';
export const BANNER_AD_UNIT_ID = '';
export const REWARDED_AD_UNIT_ID = '';

class NoopAdMobManager {
  async initialize() {
    // No-op on Web
  }
  isAdsDisabled() {
    return false;
  }
  subscribeAdsDisabled() {
    return () => {};
  }
  setAdsDisabled() {}
  loadAppOpenAd() {}
  loadRewardedAd() {}
  isRewardedReady() {
    return false;
  }
  async showRewardedAd() {
    return 'failed';
  }
  async showAppOpenAdIfAvailable() {
    return false;
  }
  destroy() {}
}

export const AdMobService = new NoopAdMobManager();
