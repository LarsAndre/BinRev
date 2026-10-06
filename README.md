# BinRev

Source for [binrev.dev](https://binrev.dev), an Astro site containing malware
analysis and reverse-engineering notes.

## Authoring

Open the `content` directory as an Obsidian vault. The vault remains the source
of truth; edit notes there, not in the generated `src/content/analyses` directory.
The build converts Obsidian wikilinks, image embeds, and callouts to Markdown/HTML.
The overview groups notes into Analyzed Samples, Windows Internals, Binary Ninja,
and Other. The site uses self-hosted JetBrains Mono Nerd Font and the
[Srcery palette](https://terminalcolors.com/themes/srcery/default/) for dark mode, including syntax
highlighting. Font licensing is included in `public/fonts/OFL.txt`.
Notes with `draft: true` or `publish: false` (including quoted strings) are excluded
from generated content, attachments, routes, search, and the sitemap.

Preview the site locally with Node.js 22.12 or newer:

```bash
npm ci --ignore-scripts
npm run dev
```

Run `npm run check`, `npm test`, and `npm run build` before deployment.
`npm run preview` serves the built site. Run `npm run test:browser` after a build;
install the test browser with `npx playwright install chromium` first, or set
`CHROMIUM_PATH` to an existing Chromium executable.
`npm run test:browser:dev` checks that screenshots still load after content
preparation runs with the development server active. Preparation preserves watched
directories and unchanged files, removing stale generated assets individually.

## Diagrams

Excalidraw drawings are exported to committed SVGs in `public/diagrams`, with
embedded fonts and padding to prevent clipped strokes. The site provides a light
diagram canvas with pan, zoom, keyboard controls, fullscreen, and downloads.
Linked screenshots from Obsidian's `Embedded Files` section are embedded in the
SVG export. Missing image references fail the export instead of producing an
incomplete drawing. Mouse-wheel zoom uses normalized deltas and small increments.
After editing a drawing, run:

```bash
CHROMIUM_PATH=/usr/bin/chromium npm run export-diagrams
```

Omit `CHROMIUM_PATH` when using Playwright's installed Chromium. Commit the updated
SVGs with the vault changes. Normal builds use these exports without a browser.
The PE reference SVG and original Excalidraw documents are copied during content
preparation. Canvas files and arbitrary Mermaid blocks do not yet have renderers.

## Structure

- `src/pages`: overview, analyses, resources, search, redirects, sitemap, and 404.
- `src/layouts`, `src/components`, `src/styles`: shared Astro UI and styles.
- `scripts`: content preparation and Excalidraw export.
- `tests`: Markdown conversion and desktop/mobile browser checks.
- `legacy`, `quartz`, `docs`, `quartz.*`: retained Quartz source/configuration for reference.

The active development, build, and deployment commands use Astro. Legacy analysis
and resource URLs redirect to the new routes.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`, which builds the site and
deploys `dist` as static assets to the `binrev-dev` Cloudflare Worker.
The Worker is served from the `binrev.dev` custom domain configured in Cloudflare.

The GitHub repository must define these Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
