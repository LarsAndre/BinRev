# BinRev

Source for [binrev.dev](https://binrev.dev), an Astro website for malware analysis
and reverse-engineering notes, hosted on Cloudflare Workers.

## Add content

**Edit `content/`. Numbered folders become homepage sections automatically.**
You can use Obsidian or any Markdown editor.

```text
content/
  index.md                         Homepage title and description
  01-Analyzed-Samples/              IcedID and Zloader
  02-Windows-Internals/             PE format and Windows structures
  03-Binary-Ninja/                  Ready for your notes
  04-Other/                        Malware loader workflow
  05-Zig-Malware-Analysis/          Ziggler (draft)
  Attachments/                     Screenshots
  Diagrams/                        SVGs and Excalidraw originals
  Templates/                       Copyable note and diagram templates
```

To add a section, create a folder such as `content/06-Linux-Internals/` with an
`index.md` inside it:

```markdown
---
title: Linux Internals
---
```

Then add Markdown files in that folder. The website discovers them, creates their
pages, and includes them in search and the sitemap. No Astro or TypeScript edits
are needed. Section numbers follow folder order; an empty section shows
“No notes published yet.”

Use `draft: true` or `publish: false` to keep a note off the website. Ziggler
remains unpublished. These flags affect the website; files committed to a public
GitHub repository are still readable there.

See **[the authoring guide](docs/authoring.md)** for publishing Ziggler, ordering
notes, adding diagrams, linking notes, and keeping URLs stable.

## Preview and validate

Install Node.js 22.19 or newer (the current Node.js 22 release is used in CI):

```sh
npm ci --ignore-scripts
npm run dev
```

Open the local URL printed by Astro. Changes under `content/` regenerate the
website while the development server runs, including new folders and notes.

```sh
npm run validate        # Type checking, content tests, and production build
npm run preview         # Serve dist/ after building
npm run test:browser    # Desktop and mobile checks against dist/
npm run test:browser:dev # Check images and adding content during development
```

Browser tests need `npx playwright install chromium`, or `CHROMIUM_PATH` pointing
to an existing Chromium/Chrome executable. See the authoring guide for diagram
exports and Windows examples.

## Repository layout

| Directory | Purpose |
| --- | --- |
| `content/` | The notes and resources you edit |
| `docs/authoring.md` | Current authoring instructions |
| `src/` | Astro pages, shared components, and styles |
| `scripts/` | Content discovery, conversion, asset copying, diagram exports |
| `tests/` | Content tests and browser checks |
| `public/` | Static site files; generated assets are ignored |
| `legacy/` | Archived Quartz implementation and earlier unused styling |

`src/content/notes/`, `src/content/sections/`, and generated assets under `public/`
are build output. They are recreated from `content/`; edit the source instead.
The site's Srcery theme and self-hosted JetBrains Mono Nerd Font are retained.
The font license is in `public/fonts/OFL.txt`.

## Deployment

Pull requests run `npm run validate`. Pushes to `main` validate and deploy `dist/`
to the `binrev-dev` Cloudflare Worker using `.github/workflows/deploy.yml`.
The custom domain `binrev.dev` is configured in Cloudflare. GitHub Actions needs
the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` repository secrets.
Existing public analysis/resource URLs and legacy Quartz redirects are retained.
