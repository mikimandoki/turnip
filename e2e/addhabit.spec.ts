import { expect, test } from '@playwright/test';

test('can add new habit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add new habit' }).click();
  const habitNameInput = page.getByLabel('Habit name');
  await habitNameInput.fill('Go for a run'); 
  await page.getByRole('button', { name: 'Add habit' }).click();
  const habitCardTitle = page.locator('.habit-card-title'); 
  await expect(habitCardTitle).toHaveText('Go for a run');
});
