import { AdMobService } from '../services/AdMobService';

// Shows a rewarded ad straight away (no dialog) before an action such as
// changing the logo, switching template or saving. Resolves true when the
// action should go ahead: the reward was earned, or no ad could be shown (not
// loaded yet, offline, AdMob frequency cap), so users are never stuck.
// Resolves false only if the user closed an ad that did open before it was
// completed; they can simply try the action again.
export const runWithRewardedAd = async () => {
  if (!AdMobService.isRewardedReady()) return true;

  const result = await AdMobService.showRewardedAd();
  return result !== 'dismissed';
};
