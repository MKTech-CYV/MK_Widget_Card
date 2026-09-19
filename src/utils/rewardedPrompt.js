import { Alert } from 'react-native';
import { AdMobService } from '../services/AdMobService';

// Offers an optional rewarded ad before an action (change logo / change preset /
// save). Resolves when the action should go ahead, which is always: the user can
// skip, and when no ad is ready (offline, no fill, AdMob frequency cap) the
// prompt is not shown at all, so this never blocks the user.
export const offerRewardedAd = (t, actionKey) => new Promise((resolve) => {
  if (!AdMobService.isRewardedReady()) {
    resolve();
    return;
  }

  Alert.alert(
    t('ads.rewardTitle'),
    t(`ads.rewardMessage.${actionKey}`),
    [
      { text: t('ads.rewardSkip'), style: 'cancel', onPress: () => resolve() },
      {
        text: t('ads.rewardWatch'),
        onPress: () => {
          AdMobService.showRewardedAd().finally(() => resolve());
        },
      },
    ],
    { cancelable: false },
  );
});
