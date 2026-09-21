import { InteractionManager, Keyboard } from 'react-native';
import { AdMobService } from '../services/AdMobService';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Shows a rewarded ad straight away (no dialog) before an action such as
// changing the logo, switching template or saving. Resolves true when the
// action should go ahead: the reward was earned, or no ad could be shown (not
// loaded yet, offline, AdMob frequency cap), so users are never stuck.
// Resolves false only if the user closed an ad that did open before it was
// completed; they can simply try the action again.
//
// The ad is a full-screen native view controller/activity. Two things must not
// overlap with it, or the app is left frozen on the screen underneath:
//  - the keyboard (dismissed, and given time to go away, before the ad opens)
//  - an open React Native <Modal> (iOS cannot present the ad over it: it flashes
//    for a moment, closes, and the screen stays frozen). Callers that start
//    from inside a modal close/hide it first and pass `settleMs` long enough for
//    its dismiss animation to finish.
//  - the app's own alerts/modals/navigation afterwards (the caller only continues
//    once the ad has fully closed, so we wait a beat after the close event).
export const runWithRewardedAd = async ({ settleMs = 400 } = {}) => {
  if (!AdMobService.isRewardedReady()) return true;

  Keyboard.dismiss();
  await wait(settleMs);

  const result = await AdMobService.showRewardedAd();

  await wait(700);
  await new Promise((resolve) => InteractionManager.runAfterInteractions(resolve));

  return result !== 'dismissed';
};
