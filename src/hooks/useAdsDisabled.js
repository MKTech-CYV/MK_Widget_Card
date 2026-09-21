import { useSyncExternalStore } from 'react';
import { AdMobService } from '../services/AdMobService';

// True while the signed-in account has ads turned off (ad_free_users/{uid}).
export const useAdsDisabled = () => useSyncExternalStore(
  (onChange) => AdMobService.subscribeAdsDisabled(onChange),
  () => AdMobService.isAdsDisabled(),
);
