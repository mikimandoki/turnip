import test, { expect } from '@playwright/test';

import { dailyHabit } from '../utils/constants';
import { addHabit } from '../utils/utils';

test.describe('add habit', () => {
  test("can't have empty name", async ({ page }) => {
    const emptyString = '';
    await page.goto('/');
    await page.getByRole('button', { name: 'Add new habit' }).click();
    await page.getByLabel('Habit name').fill(emptyString);
    await page.getByLabel('Add habit').click();
    await expect(page.getByRole('alert')).toHaveText('Name is required');
  });

  test("can't have just emoji", async ({ page }) => {
    const emojiOnly = '💀';
    await page.goto('/');
    await page.getByRole('button', { name: 'Add new habit' }).click();
    await page.getByLabel('Habit name').fill(emojiOnly);
    await page.getByLabel('Add habit').click();
    await expect(page.getByRole('alert')).toHaveText('Habit name needs more than just an emoji');
  });
});

test.describe('edit habit', () => {
  test("can't have empty name", async ({ page }) => {
    const emptyString = '';
    await page.goto('/');
    await addHabit(page, dailyHabit);
    await page.getByRole('button', { name: dailyHabit.name }).click();
    await page.getByRole('button').and(page.getByLabel('Edit habit')).click();
    await page.getByLabel('Habit name input').fill(emptyString);
    await page.getByRole('button').and(page.getByLabel('Save edits')).click();
    await expect(page.getByRole('alert')).toHaveText('Name is required');
  });

  test("can't have just emoji", async ({ page }) => {
    const emojiOnly = '💀';
    await page.goto('/');
    await addHabit(page, dailyHabit);
    await page.getByRole('button', { name: dailyHabit.name }).click();
    await page.getByRole('button').and(page.getByLabel('Edit habit')).click();
    await page.getByLabel('Habit name input').fill(emojiOnly);
    await page.getByRole('button').and(page.getByLabel('Save edits')).click();
    await expect(page.getByRole('alert')).toHaveText('Habit name needs more than just an emoji');
  });
});
