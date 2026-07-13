import { test, expect } from '@playwright/test';

// Credentials come from the environment so no secret is committed; the suite skips without them.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe('smoke (read-only)', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run the E2E smoke.');

  test('login → dashboard → candidates → candidate detail', async ({ page }) => {
    // Unauthenticated visits are redirected to the login screen.
    await page.goto('/');
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Dashboard rendered for a candidate-managing role → the Candidates nav link is visible.
    const candidatesLink = page.getByRole('link', { name: 'Candidates' }).first();
    await expect(candidatesLink).toBeVisible();

    // Candidates list loads.
    await candidatesLink.click();
    await expect(page).toHaveURL(/\/candidates$/);

    // Open the first candidate's detail (rows are links to /candidates/:id), if any exist.
    const firstCandidate = page.locator('a[href^="/candidates/"]').first();
    if (await firstCandidate.count()) {
      await firstCandidate.click();
      await expect(page).toHaveURL(/\/candidates\/\d+/);
      await expect(page.getByText(/Back to candidates/i)).toBeVisible();
    }
  });
});
