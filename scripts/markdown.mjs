import path from 'node:path';
import { slug } from 'github-slugger';
import { parse } from 'yaml';

export function splitNote(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    if (source.startsWith('---\n') || source.startsWith('---\r\n')) throw new Error('Unclosed YAML frontmatter');
    return { data: {}, frontmatter: '', body: source };
  }
  const data = parse(match[1]) ?? {};
  if (typeof data !== 'object' || Array.isArray(data)) throw new Error('YAML frontmatter must be a mapping');
  return { data, frontmatter: match[0], body: source.slice(match[0].length) };
}

export function isPublished(data) {
  return String(data.draft) !== 'true' && String(data.publish) !== 'false';
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function convertMarkdown(source, { routes = new Map(), attachments = new Set() } = {}) {
  const { frontmatter, body } = splitNote(source);
  const warnings = [];
  const images = new Set();
  let fence;
  const converted = body.split('\n').map((line) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      return line;
    }
    if (fence || /^ {4}\S/.test(line)) return line;
    // Shift the note headings down one level; the article layout owns the h1.
    line = line.replace(/^(#{1,5}) /, '$1# ');
    line = line.replace(/^(>\s*)\[!(\w+)\][+-]?\s*(.*)$/, (_, prefix, type, title) =>
      `${prefix}**${title || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}**`,
    );
    // Leave inline code unchanged, including examples of Obsidian syntax.
    line = line.split(/(`+[^`]*`+)/g).map((part, index) => {
      if (index % 2) return part;
      part = part.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, file, dimensions) => {
        const name = path.basename(file);
        if (!attachments.has(name)) throw new Error(`Missing attachment: ${file}`);
        images.add(name);
        const width = dimensions?.match(/^\d+/)?.[0];
        const alt = name.replace(/\.[^.]+$/, '').replaceAll('_', ' ');
        return `<img src="/attachments/${encodeURIComponent(name)}" alt="${escapeHtml(alt)}"${width ? ` width="${width}"` : ''} loading="lazy" decoding="async" />`;
      });
      return part.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
        const [note, anchor] = target.split('#');
        const key = note.replaceAll('\\', '/').replace(/\.md$/, '').toLowerCase();
        const href = note ? routes.get(key) ?? routes.get(path.posix.basename(key)) : '';
        if (href === undefined) {
          warnings.push(`Unresolved note: ${target}`);
          return `${label || note} *(note unavailable)*`;
        }
        return `[${label || note || anchor}](${href}${anchor ? `#${slug(anchor)}` : ''})`;
      });
    }).join('');
    // A standalone HTML image starts a CommonMark HTML block. Separate it from
    // surrounding Markdown so the following heading/list is parsed normally.
    return /^\s*<img\b[^>]*\/>\s*$/.test(line) ? `\n${line.trim()}\n` : line;
  }).join('\n');
  return { markdown: frontmatter + converted, images, warnings };
}
