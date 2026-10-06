import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDrawing } from './excalidraw.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), 'binrev-svg-export-'));
const assetRoot = path.join(root, 'node_modules/@excalidraw/excalidraw/dist/prod');
const diagrams = [
  ['MalLoaderFlow.excalidraw.md', 'malware-loader-flow.svg'],
  ['DrawingLowLevelStructures.excalidraw.md', 'low-level-structures.svg'],
];
let server;
let browser;
try {
  await build({
    stdin: {
      contents: 'import {exportToSvg} from "@excalidraw/excalidraw"; window.exportDiagram = exportToSvg;',
      resolveDir: root,
    },
    bundle: true,
    outfile: path.join(temporary, 'bundle.js'),
    format: 'iife',
    define: { 'process.env.NODE_ENV': '"production"' },
    loader: { '.woff2': 'dataurl', '.woff': 'dataurl' },
    logLevel: 'warning',
  });
  const bundle = await readFile(path.join(temporary, 'bundle.js'));
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/') {
        response.setHeader('Content-Type', 'text/html');
        response.end('<!doctype html><html><head><script>window.EXCALIDRAW_ASSET_PATH="/assets/";</script></head><body><script src="/bundle.js"></script></body></html>');
      } else if (url.pathname === '/bundle.js') {
        response.setHeader('Content-Type', 'application/javascript');
        response.end(bundle);
      } else if (url.pathname.startsWith('/assets/')) {
        const relative = decodeURIComponent(url.pathname.slice('/assets/'.length));
        const filename = path.resolve(assetRoot, relative);
        if (!filename.startsWith(assetRoot + path.sep)) throw new Error('Invalid asset path');
        response.setHeader('Content-Type', relative.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream');
        response.end(await readFile(filename));
      } else { response.writeHead(404).end(); }
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => typeof window.exportDiagram === 'function');
  await mkdir(path.join(root, 'public/diagrams'), { recursive: true });
  for (const [source, destination] of diagrams) {
    const markdown = await readFile(path.join(root, 'content/01-Resources', source), 'utf8');
    const drawing = await loadDrawing(markdown, {
      resourceDirectory: path.join(root, 'content/01-Resources'),
      attachmentDirectory: path.join(root, 'content/Attachments'),
    });
    const svg = await page.evaluate(async (drawing) => {
      const svg = await window.exportDiagram({
        elements: drawing.elements,
        appState: {
          ...drawing.appState,
          exportBackground: true,
          exportWithDarkMode: false,
          viewBackgroundColor: '#ffffff',
          exportEmbedScene: false,
          exportPadding: 48,
        },
        files: drawing.files || {},
        exportPadding: 48,
      });
      return new XMLSerializer().serializeToString(svg);
    }, drawing);
    await writeFile(path.join(root, 'public/diagrams', destination), svg + '\n');
    console.log(`Exported ${source} → ${destination}`);
  }
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
