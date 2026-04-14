import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { isNative } from './utils';

export const canVibrate = 'vibrate' in navigator;

export async function hapticsLight() {
  if (!isNative && !canVibrate) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticsMedium() {
  if (!isNative && !canVibrate) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}
