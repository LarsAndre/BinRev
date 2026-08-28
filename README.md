# BinRev

Source for [binrev.dev](https://binrev.dev), a Quartz 5 site containing malware
analysis and reverse-engineering notes.

## Authoring

Open the `content` directory as an Obsidian vault. Markdown, Obsidian wikilinks,
Mermaid diagrams, Canvas files, and Excalidraw drawings are supported.

Preview the site locally with Node.js 22:

```bash
npm ci --ignore-scripts
npm run quartz -- plugin install
npm run quartz -- build --serve
```

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`, which builds the site and
deploys `public` to the `binrev-dev` Cloudflare Pages project.

The GitHub repository must define these Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
