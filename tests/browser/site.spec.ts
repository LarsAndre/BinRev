import { test, expect } from '@playwright/test';

test('home links to published notes and theme choice survives navigation', async ({ page, request }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('BinRev');
  expect(await page.locator('body').evaluate(body => getComputedStyle(body).backgroundColor)).toBe('rgb(28, 27, 25)');
  expect(await page.locator('body').evaluate(body => getComputedStyle(body).color)).toBe('rgb(252, 232, 195)');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    '1 - Analyzed Samples', '2 - Windows Internals', '3 - Binary Ninja', '4 - Other',
  ]);
  const samples = page.getByRole('region', { name: '1 - Analyzed Samples' });
  await expect(samples.getByRole('link')).toHaveCount(2);
  await expect(page.getByRole('region', { name: '2 - Windows Internals' }).getByRole('link')).toHaveCount(2);
  await expect(page.getByRole('region', { name: '4 - Other' }).getByRole('link')).toHaveText('Malware loader workflow→');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "JetBrains Mono Nerd Font"'))).toBe(true);
  await expect(page.getByText('Ziggler')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await samples.getByRole('link', { name: 'IcedID' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IcedID.');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.prose img').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '5.2.2 - RC4 Key (sub_4014F9)', exact: true })).toBeVisible();
  for (const image of await page.locator('.prose img').all()) {
    expect((await request.get((await image.getAttribute('src'))!)).ok()).toBe(true);
  }
  await page.getByRole('button', { name: 'Expand reading area' }).click();
  await expect(page.locator('.article-toc')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Standard reading area' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('search finds terms within note bodies and never publishes draft text', async ({ page, request }) => {
  await page.goto('/search/?q=RC4');
  await expect(page.locator('#search-results')).toContainText('IcedID');
  await page.getByRole('searchbox').fill('VirtualAlloc');
  await expect(page.locator('#search-results')).toContainText('IcedID');
  await page.getByRole('searchbox').fill('Ziggler');
  await expect(page.getByRole('status')).toContainText('No results');
  await page.getByRole('searchbox').fill('does-not-exist');
  await expect(page.getByRole('status')).toContainText('No results');
  const index = await (await request.get('/search-index.json')).text();
  expect(index).not.toMatch(/Ziggler|c2\.vealend\.ing|RERDe0RvbHBo/);
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('ziggler');
  expect((await request.get('/attachments/Ziggler_1.png')).status()).toBe(404);
});

test('diagram zoom, reset, keyboard controls, and downloads work', async ({ page, request }) => {
  await page.goto('/resources/malware-loader-flow/');
  const preview = page.getByRole('link', { name: 'Expand Malware loader workflow' });
  await expect(preview.locator('img')).toBeVisible();
  await preview.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.viewer-image')).toBeVisible();
  const fitted = await page.locator('output').textContent();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  expect(parseInt((await page.locator('output').textContent())!)).toBeGreaterThan(parseInt(fitted!));
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await expect(page.locator('output')).toHaveText(fitted!);
  await page.locator('.viewer-viewport').focus();
  await page.keyboard.press('+');
  expect(parseInt((await page.locator('output').textContent())!)).toBeGreaterThan(parseInt(fitted!));
  await page.keyboard.press('0');
  await expect(page.locator('output')).toHaveText(fitted!);
  const before = await page.locator('.viewer-image').getAttribute('style');
  await page.keyboard.press('ArrowRight');
  expect(await page.locator('.viewer-image').getAttribute('style')).not.toBe(before);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(preview).toBeFocused();
  for (const link of await page.locator('a[download]').all()) {
    const response = await request.get((await link.getAttribute('href'))!);
    expect(response.ok()).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('old analysis addresses redirect and missing pages return 404', async ({ page, request }) => {
  await page.goto('/02-Analyzed-Samples/IcedID/');
  await expect(page).toHaveURL(/\/analyses\/icedid\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IcedID.');
  const response = await request.get('/analyses/ziggler/');
  expect(response.status()).toBe(404);
});

test('wheel zoom changes gradually for pixel, line, and page deltas', async ({ page }) => {
  await page.goto('/resources/low-level-structures/');
  await page.getByRole('link', { name: 'Expand Low-level Windows structures' }).click();
  await expect(page.locator('.viewer-image')).toBeVisible();
  const viewport = page.locator('.viewer-viewport');
  const scale = () => page.locator('.viewer-image').evaluate((image: HTMLImageElement) => image.getBoundingClientRect().width / image.naturalWidth);
  for (const deltaMode of [0, 1, 2]) {
    for (const deltaY of [-120, 120]) {
      const before = await scale();
      await viewport.dispatchEvent('wheel', { deltaY, deltaMode, clientX: 150, clientY: 200 });
      const after = await scale();
      const ratio = after / before;
      expect(ratio).toBeGreaterThan(0.93);
      expect(ratio).toBeLessThan(1.07);
      if (deltaY < 0) expect(after).toBeGreaterThan(before);
      else expect(after).toBeLessThan(before);
    }
  }
  const before = await scale();
  await viewport.dispatchEvent('wheel', { deltaY: -5, deltaMode: 0, clientX: 150, clientY: 200 });
  expect((await scale()) / before).toBeLessThan(1.01);
});

test('low-level SVG includes both screenshot images', async ({ request, page }, testInfo) => {
  const svg = await (await request.get('/diagrams/low-level-structures.svg')).text();
  expect(svg.match(/data:image\/png;base64,/g)).toHaveLength(2);
  await page.goto('/resources/low-level-structures/');
  await page.screenshot({ path: testInfo.outputPath('low-level-structures.png'), fullPage: true });
});
