import { getPendingNotifications } from '../utils/localNotifications';

export async function debugNotifs() {
  const { notifications } = await getPendingNotifications();
  alert(
    notifications.length === 0
      ? 'No pending notifications'
      : notifications.map(n => `[${n.id}] "${n.title}" — ${JSON.stringify(n.schedule)}`).join('\n')
  );
}
