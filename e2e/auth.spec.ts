import { test, expect } from '@playwright/test';

/**
 * Auth screen UI tests.
 *
 * These run against the real (unauthenticated) app. Because no Supabase session
 * exists, AuthGuard renders the login screen without any network dependency, so
 * the assertions here are fully deterministic.
 *
 * Language is forced to English via localStorage before the app boots so the
 * accessible names used as selectors are stable regardless of the default.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test('renders the login screen with all core elements', async ({ page }) => {
  // Branding
  await expect(page.getByRole('heading', { name: 'MoneyMind' })).toBeVisible();
  await expect(
    page.getByText('Personal and Business Financial Management System')
  ).toBeVisible();

  // Sign in / Sign up tabs
  await expect(page.getByRole('tab', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Sign Up' })).toBeVisible();

  // Sign-in form fields (default tab)
  await expect(page.locator('#signin-email')).toBeVisible();
  await expect(page.locator('#signin-password')).toBeVisible();

  // Alternative sign-in options
  await expect(page.getByText('or', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sign in with Google' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Try for Free (Guest)' })
  ).toBeVisible();
});

test('switching to the Sign Up tab reveals the full name field', async ({ page }) => {
  // Full name field belongs to the sign-up tab and is not present on sign-in.
  await expect(page.locator('#signup-name')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Sign Up' }).click();

  await expect(page.locator('#signup-name')).toBeVisible();
  await expect(page.locator('#signup-email')).toBeVisible();
  await expect(page.locator('#signup-password')).toBeVisible();
});

test('language switcher toggles the UI between English and Thai', async ({ page }) => {
  await expect(page.getByRole('tab', { name: 'Sign In' })).toBeVisible();

  // Open the language dropdown (trigger exposes an sr-only "Language" label).
  await page.getByRole('button', { name: 'Language' }).click();
  await page.getByRole('menuitem', { name: /Thai/ }).click();

  // Thai labels should now be shown.
  await expect(page.getByRole('tab', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'สมัครสมาชิก' })).toBeVisible();
});
