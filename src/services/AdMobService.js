import mobileAds, { AppOpenAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { AppState, Platform } from 'react-native';

// Google AdMob App IDs (Đọc tập trung từ file môi trường .env với fallback an toàn)
export const ADMOB_APP_ID = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || 'ca-app-pub-7281955271433795~7762039163',
  android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || 'ca-app-pub-7281955271433795~9392965747',
  default: '',
});

// Tuân thủ chính sách AdMob: Trong môi trường Development (__DEV__), luôn sử dụng TestIds
// để tránh tài khoản bị khóa do vi phạm invalid traffic / self-clicking.
export const APP_OPEN_AD_UNIT_ID = __DEV__
  ? TestIds.APP_OPEN
  : Platform.select({
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_OPEN_AD_UNIT_ID || 'ca-app-pub-7281955271433795/8024043756',
      android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN_AD_UNIT_ID || 'ca-app-pub-7281955271433795/6341453110',
      default: '',
    });

// Chính sách AdMob: Quảng cáo App Open hết hạn sau 4 giờ
const AD_EXPIRATION_HOURS = 4;
// Tần suất hiển thị do AdMob Console quyết định (frequency capping trên ad unit);
// app không tự giới hạn. Khi AdMob chặn hoặc không có quảng cáo (no fill), app
// tải lại với thời gian giãn dần để không gửi request dồn dập.
const RETRY_BASE_DELAY_MS = 30 * 1000;
const RETRY_MAX_DELAY_MS = 10 * 60 * 1000;

class AdMobManager {
  constructor() {
    this.isInitialized = false;
    this.appOpenAd = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.isShowing = false;
    this.loadTime = 0;
    this.retryCount = 0;
    this.retryTimer = null;
    this.appStateSubscription = null;
    this.currentAppState = AppState.currentState;
    this.unsubscribeLoaded = null;
    this.unsubscribeClosed = null;
    this.unsubscribeError = null;
  }

  /**
   * Khởi tạo Google Mobile Ads SDK
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await mobileAds().initialize();
      this.isInitialized = true;
      console.log('[AdMob] Google Mobile Ads SDK initialized successfully.');

      // Bắt đầu tải trước quảng cáo App Open
      this.loadAppOpenAd();

      // Lắng nghe trạng thái ứng dụng (foreground / background)
      this.setupAppStateListener();
    } catch (error) {
      console.warn('[AdMob] Error initializing Google Mobile Ads:', error);
    }
  }

  /**
   * Kiểm tra quảng cáo có còn hiệu lực không (< 4 tiếng theo chính sách AdMob)
   */
  isAdValid() {
    if (!this.isLoaded || !this.appOpenAd) return false;
    const now = Date.now();
    const hoursSinceLoad = (now - this.loadTime) / (1000 * 60 * 60);
    return hoursSinceLoad < AD_EXPIRATION_HOURS;
  }

  /**
   * Tải trước (preload) quảng cáo App Open
   */
  loadAppOpenAd() {
    if (this.isLoading || this.isShowing) return;

    // Hủy các listener cũ nếu có
    this.cleanListeners();

    this.isLoading = true;
    this.isLoaded = false;

    console.log('[AdMob] Loading App Open Ad with Unit ID:', APP_OPEN_AD_UNIT_ID);
    this.appOpenAd = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    this.unsubscribeLoaded = this.appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
      this.isLoading = false;
      this.isLoaded = true;
      this.loadTime = Date.now();
      this.retryCount = 0;
      console.log('[AdMob] App Open Ad loaded successfully.');
    });

    this.unsubscribeClosed = this.appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      this.isShowing = false;
      this.isLoaded = false;
      console.log('[AdMob] App Open Ad closed.');
      // Tự động tải trước quảng cáo tiếp theo
      this.loadAppOpenAd();
    });

    this.unsubscribeError = this.appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
      this.isLoading = false;
      this.isLoaded = false;
      console.warn('[AdMob] App Open Ad failed to load:', error);
      // Thử tải lại với thời gian giãn dần (30s, 60s, 2p ... tối đa 10p)
      const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** this.retryCount, RETRY_MAX_DELAY_MS);
      this.retryCount += 1;
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        this.loadAppOpenAd();
      }, delay);
    });

    try {
      this.appOpenAd.load();
    } catch (err) {
      this.isLoading = false;
      console.warn('[AdMob] Exception calling load():', err);
    }
  }

  /**
   * Hiển thị quảng cáo App Open nếu thỏa mãn điều kiện
   */
  async showAppOpenAdIfAvailable() {
    if (this.isShowing) {
      console.log('[AdMob] An ad is already showing.');
      return false;
    }

    if (!this.isAdValid()) {
      console.log('[AdMob] Ad is not loaded or has expired. Reloading...');
      this.loadAppOpenAd();
      return false;
    }

    try {
      this.isShowing = true;
      await this.appOpenAd.show();
      return true;
    } catch (error) {
      this.isShowing = false;
      console.warn('[AdMob] Error showing App Open Ad:', error);
      this.loadAppOpenAd();
      return false;
    }
  }

  /**
   * Theo dõi trạng thái ứng dụng để kích hoạt quảng cáo khi người dùng quay lại app
   */
  setupAppStateListener() {
    if (this.appStateSubscription) return;

    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      // Khi app chuyển từ background/inactive sang active
      if (
        (this.currentAppState === 'background' || this.currentAppState === 'inactive') &&
        nextAppState === 'active'
      ) {
        console.log('[AdMob] App brought to foreground. Checking App Open Ad eligibility...');
        this.showAppOpenAdIfAvailable();
      }

      this.currentAppState = nextAppState;
    });
  }

  cleanListeners() {
    if (this.unsubscribeLoaded) {
      this.unsubscribeLoaded();
      this.unsubscribeLoaded = null;
    }
    if (this.unsubscribeClosed) {
      this.unsubscribeClosed();
      this.unsubscribeClosed = null;
    }
    if (this.unsubscribeError) {
      this.unsubscribeError();
      this.unsubscribeError = null;
    }
  }

  destroy() {
    this.cleanListeners();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

export const AdMobService = new AdMobManager();
