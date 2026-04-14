import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { isNative } from './utils';

export async function hapticsLight() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticsMedium() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}
