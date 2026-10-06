# Astro migration checkpoint

The active goal is to move BinRev from Quartz to Astro while keeping the Obsidian
vault in `content/` as the authoring source. Continue work on the Astro site.

## Current state

- Astro 7 builds the static site into `dist/`.
- Overview, analysis listings/articles, resource listings/pages, search, About,
  sitemap, robots, legacy redirects, and a 404 page are implemented.
- Srcery dark styling, JetBrains Mono Nerd Font, light theme, article contents lists, reader mode, and responsive
  layouts are implemented.
- IcedID and Zloader are published. Ziggler remains a draft; its body and unique
  attachments are excluded from generated content, routes, search, and sitemap.
- Markdown preparation converts wikilinks, image embeds, and callouts. Generated
  notes/assets are ignored by Git; edit their source in the vault instead.
- Excalidraw SVG exports are committed with embedded fonts and 48px padding.
  Obsidian-linked image attachments are resolved into the scene before export.
  Resource diagrams and article images open a fullscreen viewer with mouse/touch
  pan and zoom, keyboard controls, downloads, and focus restoration on close.
- Cloudflare's workflow checks and builds Astro, then deploys `dist/`. Docker uses
  an Astro build stage and nginx to serve the static output.
- Quartz source/configuration is retained for reference. It is outside the active
  development and deployment path.

## Verification on 2026-10-06

- `npm run check`: zero errors, warnings, or hints.
- `npm test`: 10 content-conversion, diagram, and preparation tests pass.
- `npm run build`: successful static build.
- `npm run test:browser`: 16 tests pass across desktop/mobile, including decoding
  all IcedID/Zloader screenshots and opening them in the image viewer.
- `npm run test:browser:dev`: 4 tests pass, checking both notes before and after
  content preparation runs against a live Astro development server.
- Both Excalidraw drawings were exported with the local Chromium renderer.
- Desktop/mobile screenshots were inspected, including note images and Srcery colors.
- `git diff --check`: clean.

## Requested refinements

- The overview is a simple index: Analyzed Samples, Windows Internals, Binary Ninja,
  and Other. Binary Ninja has no published notes yet. Ziggler stays excluded.
- JetBrains Mono Nerd Font is self-hosted as WOFF2, with its OFL license.
- Dark mode uses the user's TerminalColors Srcery palette, including code highlighting.
  Light mode retains Ayu Light code highlighting.
- Standalone image embeds are separated from Markdown blocks so subsequent
  headings (including IcedID's RC4 Key section) render correctly.
- The low-level structures drawing includes EprocessStructures.png and
  ProcessHandleObjects.png, which were previously absent from SVG exports.
- Wheel zoom is normalized for pixels, lines, and pages, and limited to roughly
  six percent per event. Button and keyboard zoom use fifteen percent steps.
- Content preparation preserves the generated-note and public asset directories,
  and only rewrites changed files. Removing/recreating attachment directories had
  invalidated Vite's public-file index and caused 404s despite PNG files existing
  on disk. Stale files are now pruned individually, keeping drafts excluded.

Pushes to `main` run the GitHub Actions checks, build Astro, and deploy `dist/`
to the existing Cloudflare Worker. The temporary browser test servers use ports
4322/4323 and stop after testing. Local development uses http://127.0.0.1:4321.

## Remaining compatibility gaps

- IcedID links to `Unpacking#1.1 - Setting breakpoints`, but that note is absent
  from the vault. The build reports it and renders readable unavailable-note text.
- Arbitrary Mermaid blocks and Obsidian Canvas files do not yet have Astro
  renderers.
- Docker and a production Cloudflare deployment were not exercised locally.

See the root README for authoring, preview, diagram-export, and deployment commands.
