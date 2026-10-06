import { test, expect } from '@playwright/test';

test('zoomed SVG text matches rendering the vector at its full displayed size', async ({ page }, testInfo) => {
  // Small text and thin lines expose enlargement of a cached, low-resolution layer.
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><rect width="160" height="80" fill="white"/><path d="M20 20H140M20 60H140M40 15V65M120 15V65" stroke="black" stroke-width="0.35"/><text x="80" y="42" text-anchor="middle" font-family="monospace" font-size="7">IMAGE_DOS_HEADER</text></svg>';
  await page.route('**/__test-vector.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
  await page.goto('/resources/pe-format/');
  const preview = page.locator('[data-diagram]').first();
  await preview.evaluate(link => { (link as HTMLAnchorElement).href = '/__test-vector.svg'; });
  await preview.click();
  const image = page.locator('.viewer-image');
  await expect(image).toBeVisible();
  // Paint the fitted image before enlarging it, as happens during ordinary use.
  await page.screenshot();
  for (let step = 0; step < 10; step++) {
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  }
  await expect(page.locator('#viewer-zoom')).toHaveText('405%');
  const bounds = (await image.boundingBox())!;
  const viewport = (await page.locator('.viewer-viewport').boundingBox())!;
  const translation = await image.evaluate(image => {
    const matrix = new DOMMatrix(getComputedStyle(image).transform);
    return { x: matrix.e, y: matrix.f };
  });
  const clip = { x: Math.floor(viewport.x + viewport.width / 2 - 100), y: Math.floor(viewport.y + viewport.height / 2 - 50), width: 200, height: 100 };
  const actual = await page.screenshot({ clip });
  await testInfo.attach('zoomed-vector', { body: actual, contentType: 'image/png' });

  // Compare pixels with a separate SVG rendered directly at the enlarged size.
  const reference = await page.context().newPage();
  try {
    await reference.setContent('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#e8e8e8"><img id="reference" style="position:absolute;max-width:none"></body></html>');
    await reference.locator('img').evaluate(async (image: HTMLImageElement, { svg, bounds, viewport, translation }) => {
      image.style.left = `${viewport.x}px`;
      image.style.top = `${viewport.y}px`;
      image.style.transform = `translate(${translation.x}px, ${translation.y}px)`;
      image.style.width = `${bounds.width}px`;
      image.style.height = `${bounds.height}px`;
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await image.decode();
    }, { svg, bounds, viewport, translation });
    const expected = await reference.screenshot({ clip });
    const difference = await reference.evaluate(async (sources) => {
      const pixels = await Promise.all(sources.map(async source => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      }));
      let error = 0;
      for (let i = 0; i < pixels[0].length; i++) error += Math.abs(pixels[0][i] - pixels[1][i]);
      return error / pixels[0].length;
    }, [actual, expected].map(buffer => `data:image/png;base64,${buffer.toString('base64')}`));
    expect(difference).toBeLessThan(1);
  } finally {
    await reference.close();
  }
});
