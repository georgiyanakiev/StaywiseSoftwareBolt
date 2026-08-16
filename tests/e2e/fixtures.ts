import { test as base, expect, type Page } from '@playwright/test';

export const PRIMARY_ROUTES = [
  '/', '/front-desk', '/reservations', '/rooms', '/guests', '/housekeeping',
  '/maintenance', '/reports', '/billing', '/payments', '/invoicing',
  '/channel-manager', '/booking-engine', '/dynamic-pricing', '/upselling',
  '/guest-portal', '/settings',
] as const;

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD for authenticated module tests.');
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/^password/i).fill(password!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/(dashboard|front-desk|reservations)/, { timeout: 15_000 });
    await use(page);
  },
});

export { expect };
