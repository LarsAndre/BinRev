# Writing and organizing BinRev

The website is generated from `content/`. The numbered folders are the homepage
sections, and Markdown files inside them are the published notes. Subfolders
inside a section are supported too. Edit them in the existing Obsidian vault or
any Markdown editor.

## Add a section

Create a numbered folder, for example `content/06-Linux-Internals/`. Add an
`index.md` so Git keeps the folder even before you have written any notes:

```markdown
---
title: Linux Internals
---
```

The folder number controls its position. The homepage numbers visible sections
consecutively; you do not need a number in the title. Use a unique number and
folder name. A folder without an `index.md` also works locally; its name supplies
the title. Empty folders alone are not stored by Git.

Section `index.md` files describe sections and are not articles. Their body text
can hold authoring reminders; only the title and settings affect the website.
`content/index.md` supplies the homepage title and description.

To put a section's articles on the Analyses listing and under `/analyses/`, add
`type: analyses` to its `index.md`. Without that setting, ordinary notes use
`/notes/`. Diagrams use `/resources/` in either section type.

Set `draft: true` or `publish: false` on a section index to exclude that entire
section, including its notes and assets, from the website.

## Add a note

Create a Markdown file inside the section, such as
`content/03-Binary-Ninja/Useful shortcuts.md`. Frontmatter is optional: the
filename supplies its title and URL. For more control, copy
`content/Templates/Note.md` and edit the properties:

```markdown
---
title: Useful Binary Ninja shortcuts
slug: useful-shortcuts
description: Shortcuts I use when navigating disassembly.
tags:
  - binary-ninja
draft: true
publish: false
---

# Navigation

Write your note here.
```

When ready, set `draft: false` **and** `publish: true` (or remove both flags).
Either `draft: true` or `publish: false` excludes the note. Boolean values and
Obsidian's quoted `"true"`/`"false"` strings both work.

Published notes appear on the homepage, get an article page, and enter full-text
search and the sitemap. Their screenshots are copied only when referenced by
published content. Templates and unnumbered asset folders are never scanned as
sections. Draft flags keep content off the built website; they do not hide files
or their Git history in a public repository.

## Publish Ziggler under Zig Malware Analysis

The section already exists at `content/05-Zig-Malware-Analysis/index.md`.
Open `content/05-Zig-Malware-Analysis/Ziggler.md`, finish editing it, then change:

```yaml
draft: false
publish: true
```

It will appear under “5 - Zig Malware Analysis”, on the Analyses listing, and at
`/analyses/ziggler/`. Until then, that section displays its empty message.

## Titles, ordering, and URLs

- Folder prefixes control section order; titles come from each `index.md`.
- Notes sort by `order` (default `0`), then alphabetically by title. Add numeric
  `order: 1`, `order: 2`, etc. when you want a specific sequence.
- A note's filename determines its default URL slug: `First steps.md` becomes
  `first-steps`. Changing its title does not change its URL.
- Set `slug: first-steps` before renaming a file to preserve its existing URL.
  Keep slugs unique across the site; use lowercase letters, digits, and hyphens.
- Moving a note between sections of the same type preserves its URL. Switching
  between normal and analysis sections changes `/notes/` to `/analyses/` or vice
  versa; add a redirect in `scripts/redirects.mjs` if needed.
- Article source links use the actual path and filename, including nested folders
  and spaces.

## Links, screenshots, and formatting

Use ordinary Markdown or Obsidian links:

```markdown
[[IcedID]]
[[IcedID#1 - General Information|IcedID details]]
[[03-Binary-Ninja/Useful shortcuts|Shortcuts]]
![[Screenshot.png|1000]]
```

Store screenshots in `content/Attachments/`. Embeds support an optional width.
Links resolve by filename, explicit slug, title, or full path from `content/`.
Prefer full paths when titles are ambiguous. Links to drafts or missing notes
become readable “note unavailable” text and emit a build warning.

The build adds the page title and shifts your Markdown headings down one level.
Code fences remain unchanged. Obsidian callouts become blockquotes. Tables and
code blocks scroll on smaller screens, and screenshots open in the image viewer.
Obsidian Canvas files and arbitrary Mermaid blocks do not yet have renderers.

## Add a diagram resource

You can also embed an Excalidraw drawing directly inside an ordinary note:

```markdown
![[windows-boot-process-overview.excalidraw|1000]]
```

Store the drawing as `content/Diagrams/windows-boot-process-overview.excalidraw.md`.
Run `npm run export-diagrams` to create the sibling `windows-boot-process-overview.svg`,
then commit both files. Embeds with the full `Diagrams/...excalidraw.md` path also
work. The website displays the SVG with the same image viewer as screenshots;
no separate resource page is required. Only drawings referenced by published
notes are included. The build reports the note and export command if an SVG is missing.

For a standalone resource page, use the following steps.

Store its SVG and optional original in `content/Diagrams/`. Add a Markdown file
inside the section where it belongs, or copy `content/Templates/Diagram.md`:

```markdown
---
title: My reversing workflow
slug: my-reversing-workflow
type: diagram
description: A diagram to keep beside the disassembler.
diagram: Diagrams/my-reversing-workflow.svg
original: Diagrams/MyWorkflow.excalidraw.md
---

Optional explanatory notes can go here.
```

`diagram` and `original` are paths relative to `content/`. Omit `original` for
an SVG-only resource. The page, resource listing, homepage link, search entry,
downloads, and image viewer are generated automatically. Only referenced assets
are copied. Missing SVGs/originals fail the build with the missing path.

For Excalidraw drawings, export the SVG after editing:

```sh
npm run export-diagrams
```

This discovers both published diagram entries and drawings embedded in published
notes, exports their SVGs with embedded fonts and padding, and includes linked
screenshots. Commit the SVG alongside the original. Normal builds use the SVG
without launching a browser. Browser setup is the same as for browser tests.
To use an existing Chrome executable in PowerShell:

```powershell
$env:CHROMIUM_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run export-diagrams
```

## Preview, check, and publish

```sh
npm ci --ignore-scripts
npm run dev
```

Use Node.js 22.19 or newer. The development server watches `content/`, including
new/deleted notes and sections, and regenerates the output automatically. A failed
conversion is reported in the terminal; fix the file and save again.

Before committing, run `npm run validate`. It checks content/types, tests the
conversion and draft exclusion, and builds the static website. `npm run preview`
serves that production build. `npm run test:browser` checks desktop/mobile
behavior; `npm run test:browser:dev` also verifies adding content during development.

Push changes to `main` to run the existing Cloudflare deployment workflow.

## Where the implementation lives

`scripts/content-model.mjs` discovers and validates content. Preparation converts
Markdown and copies referenced assets into ignored build directories.
`src/lib/content.ts` supplies the same content to pages, listings, search, and the
sitemap. `src/pages/index.astro` loops over sections without naming them in code.
`src/components/NotePage.astro` is shared by note and analysis articles.

The previous Quartz implementation is archived under `legacy/quartz-site/`.
Its documentation describes the old site; use this guide for the current one.
