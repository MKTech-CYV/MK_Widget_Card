import { NativeModules, Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import {
  REVENUECAT_API_KEYS,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_OFFERING_ID,
  REVENUECAT_PRODUCT_IDS,
} from '../constants/revenueCat';

let configured = false;
let activeAppUserId = null;

const NATIVE_MODULE_UNAVAILABLE_MESSAGE =
  'RevenueCat native module is not available in this build. Please rebuild the app with a development build or store build after installing RevenueCat. Expo Go and OTA updates cannot add native purchase modules.';
export const REVENUECAT_NATIVE_MODULE_UNAVAILABLE = 'REVENUECAT_NATIVE_MODULE_UNAVAILABLE';

const createNativeModuleUnavailableError = () => {
  const error = new Error(NATIVE_MODULE_UNAVAILABLE_MESSAGE);
  error.code = REVENUECAT_NATIVE_MODULE_UNAVAILABLE;
  return error;
};

export const isRevenueCatSupported = () => (
  ['ios', 'android'].includes(Platform.OS) && Boolean(NativeModules.RNPurchases)
);

const getApiKey = () => {
  if (Platform.OS === 'ios') return REVENUECAT_API_KEYS.ios;
  if (Platform.OS === 'android') return REVENUECAT_API_KEYS.android;
  return '';
};

const ensureSupportedPlatform = () => {
  if (!['ios', 'android'].includes(Platform.OS)) {
    throw new Error('RevenueCat is only enabled for iOS and Android in this app.');
  }

  if (!NativeModules.RNPurchases) {
    throw createNativeModuleUnavailableError();
  }
};

const ensurePaywallModule = () => {
  if (!NativeModules.RNPaywalls) {
    throw createNativeModuleUnavailableError();
  }
};

const ensureCustomerCenterModule = () => {
  if (!NativeModules.RNCustomerCenter) {
    throw createNativeModuleUnavailableError();
  }
};

export const hasRevenueCatProEntitlement = (customerInfo) => (
  typeof customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_ID] !== 'undefined'
);

export const configureRevenueCat = async () => {
  ensureSupportedPlatform();

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing RevenueCat API key for this platform.');
  }

  const nativeConfigured = await Purchases.isConfigured().catch(() => false);
  if (configured || nativeConfigured) {
    configured = true;
    return true;
  }

  await Purchases.setLogLevel(LOG_LEVEL.VERBOSE).catch(() => null);
  Purchases.configure({ apiKey });
  configured = true;
  return true;
};

export const getRevenueCatCustomerInfo = async () => {
  await configureRevenueCat();
  return Purchases.getCustomerInfo();
};

export const identifyRevenueCatCustomer = async (appUserId) => {
  await configureRevenueCat();

  if (!appUserId) {
    return Purchases.getCustomerInfo();
  }

  if (activeAppUserId === appUserId) {
    return Purchases.getCustomerInfo();
  }

  const currentAppUserId = await Purchases.getAppUserID().catch(() => null);
  if (currentAppUserId === appUserId) {
    activeAppUserId = appUserId;
    return Purchases.getCustomerInfo();
  }

  const result = await Purchases.logIn(appUserId);
  activeAppUserId = appUserId;
  return result.customerInfo;
};

export const resetRevenueCatCustomer = async () => {
  if (!configured && !(await Purchases.isConfigured().catch(() => false))) return null;

  activeAppUserId = null;
  return Purchases.logOut().catch(() => null);
};

export const getRevenueCatOfferings = async () => {
  await configureRevenueCat();
  return Purchases.getOfferings();
};

export const getRevenueCatProOffering = async () => {
  const offerings = await getRevenueCatOfferings();
  return offerings?.all?.[REVENUECAT_OFFERING_ID] || offerings?.current || null;
};

export const findRevenueCatProPackage = async () => {
  const offerings = await getRevenueCatOfferings();
  const proOffering = offerings?.all?.[REVENUECAT_OFFERING_ID];
  const packages = [
    ...(proOffering?.availablePackages || []),
    ...(!proOffering ? offerings?.current?.availablePackages || [] : []),
    ...Object.values(offerings?.all || {}).flatMap(offering => offering?.availablePackages || []),
  ];

  return packages.find((item) => {
    const productId = item?.product?.identifier;
    return (
      item?.identifier === REVENUECAT_PRODUCT_IDS.pro ||
      productId === REVENUECAT_PRODUCT_IDS.pro
    );
  }) || null;
};

export const purchaseRevenueCatProPlan = async () => {
  const proPackage = await findRevenueCatProPackage();
  if (!proPackage) {
    throw new Error('Pro product is not available in the RevenueCat offering.');
  }

  const result = await Purchases.purchasePackage(proPackage);
  return result.customerInfo;
};

export const restoreRevenueCatPurchases = async () => {
  await configureRevenueCat();
  return Purchases.restorePurchases();
};

export const presentRevenueCatPaywall = async () => {
  await configureRevenueCat();
  ensurePaywallModule();
  const offering = await getRevenueCatProOffering().catch(() => null);
  const result = await RevenueCatUI.presentPaywall({ offering, displayCloseButton: true });
  const customerInfo = await Purchases.getCustomerInfo().catch(() => null);

  return {
    result,
    customerInfo,
    entitlementActive: hasRevenueCatProEntitlement(customerInfo),
    purchased: result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED,
  };
};

export const presentRevenueCatPaywallIfNeeded = async () => {
  await configureRevenueCat();
  ensurePaywallModule();
  const offering = await getRevenueCatProOffering().catch(() => null);
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_ID,
    offering,
    displayCloseButton: true,
  });
  const customerInfo = await Purchases.getCustomerInfo().catch(() => null);

  return {
    result,
    customerInfo,
    entitlementActive: hasRevenueCatProEntitlement(customerInfo),
    purchased: result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED,
  };
};

export const presentRevenueCatCustomerCenter = async ({ onCustomerInfo } = {}) => {
  await configureRevenueCat();
  ensureCustomerCenterModule();

  await RevenueCatUI.presentCustomerCenter({
    callbacks: {
      onRestoreCompleted: ({ customerInfo }) => {
        onCustomerInfo?.(customerInfo);
      },
    },
  });

  return Purchases.getCustomerInfo().catch(() => null);
};
