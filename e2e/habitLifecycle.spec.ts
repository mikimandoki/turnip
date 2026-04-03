import { expect, test } from '@playwright/test';

import type { Habit } from '../src/types';

import { addHabit } from './utils';

const dailyHabit: Habit = {
  id: '1',
  name: 'Go for a run',
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
}

test('can add new habit', async ({ page }) => {
  await page.goto('/');
  await addHabit(page, dailyHabit);
  const habitCardTitle = page.locator('.habit-card-title').first();
  await expect(habitCardTitle).toHaveText(dailyHabit.name);
});

test('can mark habit as done', async ({ page }) => {
  await page.goto('/'); 
  await addHabit(page, dailyHabit);
  await page.getByRole('button').and(page.getByLabel('Increase count')).click();
  const count = page.locator('.completion-count')
  const progress = page.locator('.progress-bar').filter({ has: page.locator('.progress-fill.done') });
  await expect.soft(count).toHaveText('1/1');
  await expect.soft(progress).toBeVisible();
});