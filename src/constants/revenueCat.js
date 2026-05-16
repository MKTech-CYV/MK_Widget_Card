const DEFAULT_REVENUECAT_IOS_API_KEY = 'appl_ERkLqHrFxAnVzVHFAcPZobQLOuO';
const DEFAULT_REVENUECAT_ANDROID_API_KEY = '';

export const REVENUECAT_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || DEFAULT_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || DEFAULT_REVENUECAT_ANDROID_API_KEY,
};

export const REVENUECAT_ENTITLEMENT_ID = 'MK Widget Card - QR Ngân Hàng Pro';
export const REVENUECAT_OFFERING_ID = 'mk_widget_card_pro';

export const REVENUECAT_PRODUCT_IDS = {
  pro: 'com.mktech.widgetcard.pro',
};
