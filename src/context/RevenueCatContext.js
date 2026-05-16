import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Purchases from 'react-native-purchases';
import { useAuth } from './AuthContext';
import { useRemoteSettings } from './RemoteSettingsContext';
import { updateProfilePremium } from '../services/ProfileService';
import {
  configureRevenueCat,
  getRevenueCatCustomerInfo,
  hasRevenueCatProEntitlement,
  identifyRevenueCatCustomer,
  isRevenueCatSupported,
  presentRevenueCatCustomerCenter,
  presentRevenueCatPaywall,
  presentRevenueCatPaywallIfNeeded,
  purchaseRevenueCatProPlan,
  resetRevenueCatCustomer,
  restoreRevenueCatPurchases,
} from '../services/RevenueCatService';

const RevenueCatContext = createContext(null);

export const RevenueCatProvider = ({ children }) => {
  const { user, isAuthReady, refreshProfile, cacheAccountProfile } = useAuth();
  const { paymentEnabled, isReady: areRemoteSettingsReady } = useRemoteSettings();
  const [customerInfo, setCustomerInfo] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [error, setError] = useState(null);
  const premiumSyncedUserIds = useRef(new Set());

  const applyCustomerInfo = useCallback(async (nextCustomerInfo, { refreshAccountProfile = false } = {}) => {
    const entitlementActive = hasRevenueCatProEntitlement(nextCustomerInfo);
    setCustomerInfo(nextCustomerInfo || null);
    setIsPremium(entitlementActive);

    if (entitlementActive && user?.id && !premiumSyncedUserIds.current.has(user.id)) {
      const updatedProfile = await updateProfilePremium(user.id, true);
      premiumSyncedUserIds.current.add(user.id);
      if (updatedProfile) {
        await cacheAccountProfile?.(updatedProfile).catch(() => null);
      }
    }

    if (refreshAccountProfile && user?.id) {
      await refreshProfile?.(user).catch(() => null);
    }

    return nextCustomerInfo || null;
  }, [cacheAccountProfile, refreshProfile, user]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!paymentEnabled || !isRevenueCatSupported()) return null;

    try {
      const info = await getRevenueCatCustomerInfo();
      setError(null);
      return applyCustomerInfo(info);
    } catch (nextError) {
      setError(nextError);
      return null;
    }
  }, [applyCustomerInfo, paymentEnabled]);

  useEffect(() => {
    if (!isAuthReady || !areRemoteSettingsReady) {
      setIsReady(isAuthReady && areRemoteSettingsReady);
      return undefined;
    }

    if (!paymentEnabled || !isRevenueCatSupported()) {
      setCustomerInfo(null);
      setIsPremium(false);
      setIsReady(true);
      return undefined;
    }

    let mounted = true;
    const listener = (info) => {
      if (mounted) {
        applyCustomerInfo(info, { refreshAccountProfile: true }).catch(() => null);
      }
    };

    const init = async () => {
      try {
        await configureRevenueCat();
        Purchases.addCustomerInfoUpdateListener(listener);

        const info = user?.id
          ? await identifyRevenueCatCustomer(user.id)
          : await getRevenueCatCustomerInfo();

        if (mounted) {
          setError(null);
          await applyCustomerInfo(info, { refreshAccountProfile: true });
          setIsReady(true);
        }
      } catch (nextError) {
        if (mounted) {
          setError(nextError);
          setIsReady(true);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [applyCustomerInfo, areRemoteSettingsReady, isAuthReady, paymentEnabled, user?.id]);

  useEffect(() => {
    if (isAuthReady && !user?.id && paymentEnabled && isRevenueCatSupported()) {
      resetRevenueCatCustomer().catch(() => null);
      setCustomerInfo(null);
      setIsPremium(false);
      premiumSyncedUserIds.current.clear();
    }
  }, [isAuthReady, paymentEnabled, user?.id]);

  const openPaywall = useCallback(async ({ onlyIfNeeded = false } = {}) => {
    if (!paymentEnabled) return null;

    const result = onlyIfNeeded
      ? await presentRevenueCatPaywallIfNeeded()
      : await presentRevenueCatPaywall();

    if (result.customerInfo) {
      await applyCustomerInfo(result.customerInfo, { refreshAccountProfile: true });
    }

    return result;
  }, [applyCustomerInfo, paymentEnabled]);

  const restorePurchases = useCallback(async () => {
    if (!paymentEnabled) return null;

    const info = await restoreRevenueCatPurchases();
    await applyCustomerInfo(info, { refreshAccountProfile: true });
    return info;
  }, [applyCustomerInfo, paymentEnabled]);

  const purchaseProPlan = useCallback(async () => {
    if (!paymentEnabled) return null;

    const info = await purchaseRevenueCatProPlan();
    await applyCustomerInfo(info, { refreshAccountProfile: true });
    return info;
  }, [applyCustomerInfo, paymentEnabled]);

  const openCustomerCenter = useCallback(async () => {
    if (!paymentEnabled) return null;

    const info = await presentRevenueCatCustomerCenter({
      onCustomerInfo: (nextInfo) => {
        applyCustomerInfo(nextInfo, { refreshAccountProfile: true }).catch(() => null);
      },
    });

    if (info) {
      await applyCustomerInfo(info, { refreshAccountProfile: true });
    }

    return info;
  }, [applyCustomerInfo, paymentEnabled]);

  const value = useMemo(() => ({
    customerInfo,
    error,
    isPremium,
    isReady,
    isSupported: isRevenueCatSupported(),
    openCustomerCenter,
    openPaywall,
    purchaseProPlan,
    refreshCustomerInfo,
    restorePurchases,
  }), [
    customerInfo,
    error,
    isPremium,
    isReady,
    openCustomerCenter,
    openPaywall,
    purchaseProPlan,
    refreshCustomerInfo,
    restorePurchases,
  ]);

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
};

export const useRevenueCat = () => {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return context;
};
