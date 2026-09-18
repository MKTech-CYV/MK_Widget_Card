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
// Giới hạn tần suất hiển thị (Cooldown):
// Khớp với cấu hình trên AdMob Console (tối đa 2 cái / 1 tiếng):
// - Trong môi trường DEV: 0 phút (để test liên tục)
// - Trong môi trường PRODUCTION: 30 phút giữa 2 lần hiển thị (chia đều 2 lần / 1 tiếng)
const COOLDOWN_MINUTES = __DEV__ ? 0 : 30;
// Giới hạn tối đa số lần hiển thị trong 1 ngày cho mỗi người dùng (UX Protection)
const MAX_DAILY_IMPRESSIONS = __DEV__ ? Infinity : 6;

class AdMobManager {
  constructor() {
    this.isInitialized = false;
    this.appOpenAd = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.isShowing = false;
    this.loadTime = 0;
    this.lastShownTime = 0;
    this.dailyCount = 0;
    this.dailyCountDate = new Date().toISOString().slice(0, 10);
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
   * Kiểm tra thời gian nghỉ giữa các lần hiển thị (Cooldown)
   */
  isCooldownPassed() {
    const now = Date.now();
    const minutesSinceLastShown = (now - this.lastShownTime) / (1000 * 60);
    return minutesSinceLastShown >= COOLDOWN_MINUTES;
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
      console.log('[AdMob] App Open Ad loaded successfully.');
    });

    this.unsubscribeClosed = this.appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      this.isShowing = false;
      this.isLoaded = false;
      this.lastShownTime = Date.now();
      console.log('[AdMob] App Open Ad closed.');
      // Tự động tải trước quảng cáo tiếp theo
      this.loadAppOpenAd();
    });

    this.unsubscribeError = this.appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
      this.isLoading = false;
      this.isLoaded = false;
      console.warn('[AdMob] App Open Ad failed to load:', error);
      // Thử tải lại sau 30 giây nếu lỗi
      setTimeout(() => {
        this.loadAppOpenAd();
      }, 30000);
    });

    try {
      this.appOpenAd.load();
    } catch (err) {
      this.isLoading = false;
      console.warn('[AdMob] Exception calling load():', err);
    }
  }

  /**
   * Kiểm tra giới hạn số lần hiển thị tối đa trong 1 ngày
   */
  isDailyCapReached() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyCountDate !== today) {
      this.dailyCountDate = today;
      this.dailyCount = 0;
      return false;
    }
    return this.dailyCount >= MAX_DAILY_IMPRESSIONS;
  }

  /**
   * Hiển thị quảng cáo App Open nếu thỏa mãn điều kiện
   */
  async showAppOpenAdIfAvailable() {
    if (this.isShowing) {
      console.log('[AdMob] An ad is already showing.');
      return false;
    }

    if (this.isDailyCapReached()) {
      console.log(`[AdMob] Daily cap reached (${MAX_DAILY_IMPRESSIONS} ads/day). Skipping to protect UX.`);
      return false;
    }

    if (!this.isAdValid()) {
      console.log('[AdMob] Ad is not loaded or has expired. Reloading...');
      this.loadAppOpenAd();
      return false;
    }

    if (this.lastShownTime > 0 && !this.isCooldownPassed()) {
      console.log('[AdMob] Cooldown period active, skipping App Open Ad to protect UX.');
      return false;
    }

    try {
      this.isShowing = true;
      this.dailyCount++;
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
