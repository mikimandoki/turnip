import { Haptics, ImpactStyle } from '@capacitor/haptics';

export async function hapticsLight() {
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticsMedium() {
  await Haptics.impact({ style: ImpactStyle.Medium });
}
