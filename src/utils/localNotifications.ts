import { LocalNotifications } from '@capacitor/local-notifications';

// Deterministic integer ID from a habit's nanoid string
function habitNotificationId(habitId: string): number {
  let h = 5381;
  for (let i = 0; i < habitId.length; i++) {
    h = ((h << 5) + h) ^ habitId.charCodeAt(i);
  }
  return Math.abs(h) % 2_147_483_647;
}

export async function checkNotificationPermission(): Promise<boolean> {
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

export async function scheduleHabitNotification(
  habitId: string,
  habitName: string,
  time: string
): Promise<void> {
  const [hour, minute] = time.split(':').map(Number);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: habitNotificationId(habitId),
        title: habitName,
        body: 'Time to log your habit!',
        schedule: {
          on: { hour, minute },
        },
      },
    ],
  });
}

export async function cancelHabitNotification(habitId: string): Promise<void> {
  await LocalNotifications.cancel({
    notifications: [{ id: habitNotificationId(habitId) }],
  });
}

export async function cancelAllHabitNotifications(habitIds: string[]): Promise<void> {
  if (habitIds.length === 0) return;
  await LocalNotifications.cancel({
    notifications: habitIds.map(id => ({ id: habitNotificationId(id) })),
  });
}
