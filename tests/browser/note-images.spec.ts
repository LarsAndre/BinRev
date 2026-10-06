import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
