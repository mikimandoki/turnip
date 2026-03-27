import { parseHabitEmoji } from '../utils/habits';

export const Modals = {
  deleteHabit: (name: string) => ({
    title: `Delete "${parseHabitEmoji(name).cleanName}"?`,
    description:
      'Are you sure you want to delete this habit?\n\nThis will remove all your progress. This cannot be undone.',
    confirm: 'Delete',
    cancel: 'Cancel',
  }),
};
