import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = process.env.SHOT; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((t) => { try { localStorage.setItem('rg-theme', t); } catch {} }, process.env.THEME);
const page = await ctx.newPage();
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await page.locator('input[type=email]').fill(process.env.E2E_EMAIL);
await page.locator('input[type=password]').fill(process.env.E2E_PASSWORD);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 15000 });
await page.waitForTimeout(1000);
for (const [name, path, after] of [
  ['board', '/candidates', 'board'],
  ['upload', '/upload', null],
  ['audit', '/audit', null],
  ['drafts', '/upload', 'drafts'],
]) {
  await page.goto('http://localhost:5173' + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  if (after === 'board') {
    const t = page.getByRole('button', { name: /^board$/i }).first();
    if (await t.count()) { await t.click(); await page.waitForTimeout(1400); }
  }
  if (after === 'drafts') {
    const t = page.getByRole('button', { name: /review staging|staging workspace/i }).first();
    if (await t.count()) { await t.click(); await page.waitForTimeout(1800); }
  }
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: `${OUT}/${process.env.THEME}-${name}.png`, fullPage: true });
  console.log(`ok ${name.padEnd(10)} overflow=${ov}`);
}
await b.close();
