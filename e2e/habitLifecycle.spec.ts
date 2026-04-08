import { expect, test } from '@playwright/test';

import type { Habit } from '../src/types';

import { parseHabitEmoji } from '../src/utils/habits';
import { deleteUser, ensureTestUserExistsVerified } from './supabaseAdmin';
import { addHabit } from './utils';

const dailyHabit: Habit = {
  id: '1',
  name: 'Go for a run',
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
};

const multiCountDailyHabit: Habit = {
  id: '2',
  name: 'Eat a healthy meal',
  frequency: { times: 4, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
};

const habitWithEmoji: Habit = {
  id: '3',
  name: '💪🏼 Gym',
  frequency: { times: 1, periodLength: 1, periodUnit: 'day' },
  createdAt: new Date().toISOString(),
};

test('can add new habit', async ({ page }) => {
  await page.goto('/');
  await addHabit(page, dailyHabit);
  const habitCardTitle = page.locator('[data-testid="habit-title"]');
  await expect(habitCardTitle).toHaveText(dailyHabit.name);
});

test('can mark habit as done', async ({ page }) => {
  await page.goto('/');
  await addHabit(page, dailyHabit);
  await page.getByRole('button').and(page.getByLabel('Increase count')).click();
  const count = page.locator('[data-testid="completion-count"]');
  const progress = page
    .locator('[data-testid="progress-bar"]')
    .filter({ has: page.locator('[data-status="done"]') });
  await expect.soft(count).toHaveText('1/1');
  await expect.soft(progress).toBeVisible();
});

test('only start showing streak for 2 consecutive daily completions', async ({ page }) => {
  const fakeToday = new Date('2026-01-01');
  await page.clock.setFixedTime(fakeToday);
  await page.goto('/');
  await addHabit(page, dailyHabit);
  await page.getByRole('button').and(page.getByLabel('Increase count')).click();
  const streak = page.locator('[data-testid="streak-indicator-ongoing"]');
  await expect.soft(streak).not.toBeVisible();
  await page.getByRole('button').and(page.getByLabel('Next day')).click();
  await page.getByRole('button').and(page.getByLabel('Increase count')).click();
  await expect(streak).toHaveText('🔥 2 day streak');
});

test('can delete habit', async ({ page }) => {
  await page.goto('/');
  await addHabit(page, dailyHabit);
  await page.getByRole('button').and(page.getByLabel('Habit card')).click();
  await page.getByRole('button', { name: 'Delete habit' }).click();
  const modalTitle = page.getByText(`Delete "${dailyHabit.name}"?`);
  const modalBody = page.getByText(
    `Are you sure you want to delete this habit?\n\nThis will remove all your progress. This cannot be undone.`
  );
  await expect.soft(modalTitle).toBeVisible();
  await expect.soft(modalBody).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  const settingsBtn = page.getByRole('button', { name: 'Open settings' });
  await expect(settingsBtn).toBeVisible();
  const habitCardTitle = page.locator('[data-testid="habit-title"]');
  await expect(habitCardTitle).not.toBeVisible();
});

test('can mark multi-completion daily habit as done', async ({ page }) => {
  await page.goto('/');
  await addHabit(page, multiCountDailyHabit);
  const target = multiCountDailyHabit.frequency.times;
  // Starting at c = 1 since that's the first number we get when we complete
  for (let c = 1; c < target; c++) {
    const status = c === target ? 'completed' : 'in-progress';
    await page.getByRole('button').and(page.getByLabel('Increase count')).click();
    const count = page.locator('[data-testid="completion-count"]');
    const progress = page
      .locator('[data-testid="progress-bar"]')
      .filter({ has: page.locator(`[data-status="${status}"]`) });
    await expect.soft(count).toHaveText(`${c}/${target}`);
    await expect.soft(progress).toBeVisible();
  }
});

test('can show habit emoji on daily view', async ({ page }) => {
  await page.goto('/');
  await addHabit(page, habitWithEmoji);
  const habitEmoji = page.getByLabel('Habit icon');
  await expect(habitEmoji).toHaveText(parseHabitEmoji(habitWithEmoji.name).emoji);
});

test('sync', async ({ browser }, testInfo) => {
  const workerId = testInfo.workerIndex;
  const email = `test+worker${workerId}@getturnip.com`;
  const userID = await ensureTestUserExistsVerified(email);
  const pw = process.env.SUPABASE_TEST_PW;
  if (!pw) {
    throw new Error('Supabase test credentials missing');
  }

  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  await Promise.all(
    [page1, page2].map(async page => {
      await page.goto('/?pwTest=1');
      await page.getByLabel('Open settings').click();
      await page.getByTestId('email-input').fill(email);
      await page.getByTestId('dev-password').fill(pw);
      await page.getByTestId('dev-submit').click();
      await expect(page.getByText('Sign out')).toBeVisible();
      await page.getByLabel('Navigate back').click();
    })
  );
  try {
    await addHabit(page1, dailyHabit);
    await page2.reload();
    const habitCardTitle = page2.locator('[data-testid="habit-title"]');
    await expect(habitCardTitle).toHaveText(dailyHabit.name);
  } finally {
    await page1.getByTestId('dev-delete-all').click();
    await deleteUser(userID);
  }
});
