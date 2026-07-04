import { test, expect } from '@playwright/test';

/**
 * Guest (anonymous) login wiring test.
 *
 * Rather than depend on the live Supabase project (which would create real
 * anonymous users and require anonymous sign-in to be enabled), this test mocks
 * the Supabase auth endpoints. It verifies that:
 *   1. clicking the Guest button calls supabase.auth.signInAnonymously(), i.e.
 *      a POST hits /auth/v1/signup, and
 *   2. on a successful response the app leaves the login screen.
 */

const FUTURE_EXPIRES_AT = Math.floor(Date.now() / 1000) + 60 * 60; // 1h ahead

const mockAnonymousSession = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: FUTURE_EXPIRES_AT,
  refresh_token: 'mock-refresh-token',
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: '',
    is_anonymous: true,
    app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
  });

  // Mock anonymous sign-up (signInAnonymously -> POST /auth/v1/signup).
  await page.route('**/auth/v1/signup**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAnonymousSession),
    });
  });

  // Keep any follow-up auth/data calls from failing noisily.
  await page.route('**/auth/v1/token**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAnonymousSession),
    })
  );
  await page.route('**/auth/v1/user**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAnonymousSession.user),
    })
  );
  await page.route('**/rest/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test('Guest button signs in anonymously and leaves the login screen', async ({ page }) => {
  const guestButton = page.getByRole('button', { name: 'Try for Free (Guest)' });
  await expect(guestButton).toBeVisible();

  const signupRequest = page.waitForRequest(
    (req) => req.url().includes('/auth/v1/signup') && req.method() === 'POST'
  );

  await guestButton.click();

  // The anonymous sign-in request must fire.
  await signupRequest;

  // After a successful guest sign-in the login form is gone.
  await expect(page.locator('#signin-email')).toHaveCount(0, { timeout: 15000 });
});
