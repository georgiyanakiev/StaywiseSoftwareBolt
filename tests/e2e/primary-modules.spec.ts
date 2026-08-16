import { test, expect, PRIMARY_ROUTES } from './fixtures';

for (const route of PRIMARY_ROUTES) {
  test(`primary module loads: ${route}`, async ({ authenticatedPage }) => {
    await authenticatedPage.goto(route);
    await expect(authenticatedPage.locator('body')).toBeVisible();
    await expect(authenticatedPage.locator('text=Something went wrong')).toHaveCount(0);
  });
}

test('destructive actions require confirmation and are not executed by default', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/rooms');
  const deleteButton = authenticatedPage.getByRole('button', { name: /delete/i }).first();
  test.skip(await deleteButton.count() === 0, 'No seeded record available to exercise a destructive action.');
  await deleteButton.click();
  await expect(authenticatedPage.getByRole('dialog').or(authenticatedPage.getByText(/are you sure|cannot be undone/i))).toBeVisible();
  await expect(authenticatedPage.getByRole('button', { name: /cancel/i })).toBeVisible();
  test.skip(process.env.E2E_ALLOW_MUTATIONS !== 'true', 'Mutation execution is disabled; confirmation behavior was verified.');
  await authenticatedPage.getByRole('button', { name: /^delete$/i }).click();
});
