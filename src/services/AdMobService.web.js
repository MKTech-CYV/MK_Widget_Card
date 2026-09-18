// Web Fallback: Google Mobile Ads SDK is native only (iOS & Android)
export const ADMOB_APP_ID = '';
export const APP_OPEN_AD_UNIT_ID = '';

class NoopAdMobManager {
  async initialize() {
    // No-op on Web
  }
  loadAppOpenAd() {}
  async showAppOpenAdIfAvailable() {
    return false;
  }
  destroy() {}
}

export const AdMobService = new NoopAdMobManager();
