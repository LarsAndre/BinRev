import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';

test.use({ reducedMotion: 'reduce' });

async function decodeImages(page: Page, expectedCount: number) {
  const images = page.locator('.prose img');
  await expect(images).toHaveCount(expectedCount);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await image.evaluate((image: HTMLImageElement) => image.decode());
  }
}

test('new sections and notes appear during development and are searchable', async ({ page, request }) => {
  test.skip(process.env.BINREV_TEST_DEV !== '1', 'Exercises the content watcher on the development server.');
  const directory = new URL('../../content/99-Authoring-Test/', import.meta.url);
  const filename = new URL('Browser authoring check.md', directory);
  try {
    await page.goto('/');
    await mkdir(directory);
    await writeFile(filename, '---\ntitle: Browser authoring check\n---\n# A new note\nWatcher verification text.');
    await expect(page.getByRole('heading', { name: '6 - Authoring Test', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Browser authoring check' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Browser authoring check.');
    await expect(page.locator('.prose')).toContainText('Watcher verification text.');
    await expect(page.getByRole('link', { name: 'View source' })).toHaveAttribute('href', /99-Authoring-Test\/Browser%20authoring%20check\.md$/);
    await page.goto('/search/?q=Watcher');
    await expect(page.locator('#search-results')).toContainText('Browser authoring check');
    expect(await (await request.get('/sitemap.xml')).text()).toContain('/notes/browser-authoring-check/');
    await page.goto('/');
    await rm(filename);
    await expect(page.getByRole('region', { name: '6 - Authoring Test' })).toContainText('No notes published yet.');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

for (const [note, imageCount] of [['icedid', 7], ['zloader', 9]] as const) {
  test(`${note} screenshots decode and open in the image viewer`, async ({ page }, testInfo) => {
    await page.goto(`/analyses/${note}/`);
    await decodeImages(page, imageCount);

    if (process.env.BINREV_TEST_DEV === '1') {
      // Reproduce preparing content while Vite's public-file watcher is active.
      execFileSync(process.execPath, ['scripts/prepare-content.mjs'], {
        cwd: fileURLToPath(new URL('../../', import.meta.url)), stdio: 'pipe',
      });
      await page.reload();
      await decodeImages(page, imageCount);
    }

    const first = page.locator('.prose img').first();
    await first.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`${note}-image.png`) });
    await first.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const enlarged = page.locator('.viewer-image');
    await expect(enlarged).toBeVisible();
    await enlarged.evaluate((image: HTMLImageElement) => image.decode());
    expect(await enlarged.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });
}
