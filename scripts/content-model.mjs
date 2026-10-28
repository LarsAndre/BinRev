import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { slug as githubSlug } from 'github-slugger';
import { splitNote, isPublished } from './markdown.mjs';

export function slugify(value) {
  return githubSlug(value.trim().toLowerCase().replaceAll('_', '-')).replace(/-+/g, '-');
}

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

function text(data, key, fallback, file) {
  const value = data[key] ?? fallback;
  if (typeof value !== 'string' || !value.trim()) fail(file, `${key} must be a nonempty string`);
  return value.trim();
}

export function contentPath(directory, relative) {
  if (typeof relative !== 'string') throw new Error('Asset paths must be strings');
  const resolved = path.resolve(directory, relative);
  if (!resolved.startsWith(path.resolve(directory) + path.sep)) {
    throw new Error(`Asset must be inside content/: ${relative}`);
  }
  return resolved;
}

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(filename));
    else if (/\.md$/i.test(entry.name) && !/\.excalidraw\.md$/i.test(entry.name) && entry.name !== 'index.md') files.push(filename);
  }
  return files.sort();
}

async function optionalNote(filename) {
  try { return splitNote(await readFile(filename, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return { data: {}, body: '' }; throw error; }
}

// Numbered directories are the author-facing API. Everything else (routes,
// listings, search, and assets) is derived from this model by the build.
export async function loadContent(root) {
  const directory = path.join(root, 'content');
  const sections = [];
  const notes = [];
  const usedSlugs = new Map();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const match = entry.name.match(/^(\d+)-(.+)$/);
    if (!entry.isDirectory() || !match) continue;
    const sectionFile = `${entry.name}/index.md`;
    const { data } = await optionalNote(path.join(directory, sectionFile));
    if (!isPublished(data)) continue;
    const section = {
      id: slugify(match[2]),
      title: text(data, 'title', match[2].replaceAll('-', ' '), sectionFile),
      order: Number(match[1]),
      type: data.type ?? 'notes',
    };
    if (!['notes', 'analyses'].includes(section.type)) fail(sectionFile, 'type must be notes or analyses');
    if (sections.some(other => other.order === section.order || other.id === section.id)) fail(sectionFile, 'section number and name must be unique');
    sections.push(section);
    for (const filename of await markdownFiles(path.join(directory, entry.name))) {
      const sourcePath = path.relative(directory, filename).split(path.sep).join('/');
      const source = await readFile(filename, 'utf8');
      const { data, body } = splitNote(source);
      if (!isPublished(data)) continue;
      const basename = path.basename(filename, '.md');
      const title = text(data, 'title', basename, sourcePath);
      const slug = text(data, 'slug', slugify(basename), sourcePath);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(sourcePath, 'slug must use lowercase letters, digits, and single hyphens');
      if (usedSlugs.has(slug)) fail(sourcePath, `duplicate slug "${slug}" (also in ${usedSlugs.get(slug)}); set a unique slug in frontmatter`);
      usedSlugs.set(slug, sourcePath);
      if (data.type && !['note', 'diagram'].includes(data.type)) fail(sourcePath, 'type must be note or diagram');
      const kind = data.type === 'diagram' ? 'resource' : section.type === 'analyses' ? 'analysis' : 'note';
      const route = kind === 'resource' ? 'resources' : kind === 'analysis' ? 'analyses' : 'notes';
      const order = data.order ?? 0;
      if (!Number.isFinite(order)) fail(sourcePath, 'order must be a number');
      const note = { ...data, title, slug, section: section.id, sectionTitle: section.title, kind, order, url: `/${route}/${slug}/`, sourcePath, body, source };
      if (kind === 'resource') {
        note.diagram = text(data, 'diagram', undefined, sourcePath);
        note.original = text(data, 'original', note.diagram, sourcePath);
        if (!/\.svg$/i.test(note.diagram)) fail(sourcePath, 'diagram must be a content-relative SVG path');
        contentPath(directory, note.diagram);
        contentPath(directory, note.original);
      }
      notes.push(note);
    }
  }
  sections.sort((a, b) => a.order - b.order);
  notes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'en'));
  const routes = new Map();
  const ambiguous = new Set();
  for (const note of notes) {
    const aliases = [note.slug, note.title.toLowerCase(), path.basename(note.sourcePath, '.md').toLowerCase()];
    if (note.kind === 'resource') aliases.push(path.basename(note.original).replace(/(?:\.excalidraw)?\.(?:md|svg)$/i, '').toLowerCase());
    for (const alias of aliases) {
      if (routes.has(alias) && routes.get(alias) !== note.url) ambiguous.add(alias);
      else routes.set(alias, note.url);
    }
    routes.set(note.sourcePath.replace(/\.md$/, '').toLowerCase(), note.url);
  }
  for (const alias of ambiguous) routes.delete(alias);
  return { sections, notes, routes };
}
