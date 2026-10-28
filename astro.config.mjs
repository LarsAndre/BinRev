import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import scrollableTables from './scripts/tables.mjs';
import { redirects } from './scripts/redirects.mjs';
import srceryTheme from './scripts/srcery-theme.mjs';
import watchContent from './scripts/watch-content.mjs';

export default defineConfig({
  site: 'https://binrev.dev',
  output: 'static',
  trailingSlash: 'always',
  redirects,
  integrations: [watchContent()],
  markdown: {
    processor: unified({ rehypePlugins: [scrollableTables] }),
    shikiConfig: {
      themes: { light: 'ayu-light', dark: srceryTheme },
      wrap: false,
    },
  },
});
