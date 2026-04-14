import type { Page } from '@playwright/test';

import type { Habit } from '../../src/types';

export async function addHabit(page: Page, habit: Habit) {
  await page.getByRole('button', { name: 'Add new habit' }).click();
  await page.getByLabel('Habit name').fill(habit.name);
  if (habit.frequency.periodLength > 1) {
    await page.getByRole('combobox', { name: 'Frequency unit' }).click();
    await page.getByRole('option', { name: 'custom...' }).click();
    await page.getByLabel('Period length').fill(habit.frequency.periodLength.toString());
  } else {
    await page
      .getByRole('combobox', { name: 'Frequency unit' })
      .selectOption(habit.frequency.periodUnit);
    await page.getByLabel('Times', { exact: true }).fill(habit.frequency.times.toString());
  }
  if (habit.note) {
    await page.getByLabel('Note').fill(habit.note);
  }
  await page.getByRole('button', { name: 'Add habit' }).click();
}
