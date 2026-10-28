import { mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stringify } from 'yaml';
import { convertMarkdown, splitNote } from './markdown.mjs';
import { loadContent, contentPath } from './content-model.mjs';
import { redirects } from './redirects.mjs';

// Preserve directories and unchanged files for Astro/Vite's live watchers.
async function syncFiles(directory, files) {
  await mkdir(directory, { recursive: true });
  for (const name of await readdir(directory)) {
    if (!files.has(name)) await rm(path.join(directory, name), { recursive: true, force: true });
  }
  for (const [name, content] of files) {
    const destination = path.join(directory, name);
    let previous;
    try { previous = await readFile(destination); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    if (!previous?.equals(buffer)) await writeFile(destination, buffer);
  }
}

export async function prepareContent(root) {
  const source = path.join(root, 'content');
  const { sections, notes, routes } = await loadContent(root);
  const attachments = new Set(await readdir(path.join(source, 'Attachments')).catch(error => {
    if (error.code === 'ENOENT') return []; throw error;
  }));
  const generatedNotes = new Map();
  const images = new Map();
  const diagrams = new Map();
  const originals = new Map();
  async function addAsset(target, relative) {
    const name = path.basename(relative);
    const content = await readFile(contentPath(source, relative));
    if (target.has(name) && !target.get(name).equals(content)) throw new Error(`Conflicting asset filename: ${relative}`);
    target.set(name, content);
    return name;
  }
  for (const note of notes) {
    const { body, source: markdown, ...data } = note;
    const converted = convertMarkdown(markdown, { routes, attachments });
    if (note.kind === 'resource') {
      data.image = `/diagrams/${encodeURIComponent(await addAsset(diagrams, note.diagram))}`;
      data.original = `/originals/${encodeURIComponent(await addAsset(originals, note.original))}`;
      data.format = note.original.endsWith('.excalidraw.md') ? 'Excalidraw' : 'SVG reference';
    }
    generatedNotes.set(`${note.slug}.md`, `---\n${stringify(data)}---\n${splitNote(converted.markdown).body}`);
    for (const image of converted.images) images.set(image, await readFile(path.join(source, 'Attachments', image)));
    for (const warning of converted.warnings) console.warn(`${note.sourcePath}: ${warning}`);
  }
  const generatedSections = new Map(sections.map(section => [`${section.id}.md`, `---\n${stringify(section)}---\n`]));
  // Resolve and validate all content before changing the generated output.
  await syncFiles(path.join(root, 'src/content/notes'), generatedNotes);
  await syncFiles(path.join(root, 'src/content/sections'), generatedSections);
  await syncFiles(path.join(root, 'public/attachments'), images);
  await syncFiles(path.join(root, 'public/diagrams'), diagrams);
  await syncFiles(path.join(root, 'public/originals'), originals);
  await writeFile(path.join(root, 'public/_redirects'), [
    ...Object.entries(redirects).map(([from, to]) => `${from} ${to} 301`),
    '/01-Resources/PE_Format_Overview.svg /diagrams/pe-format.svg 301',
    '/01-resources/pe_format_overview.svg /diagrams/pe-format.svg 301',
    '/01-resources/PE_Format_Overview.svg /diagrams/pe-format.svg 301',
    '/Attachments/* /attachments/:splat 301',
  ].join('\n') + '\n');
  console.log(`Prepared ${sections.length} sections and ${notes.length} published entries. Drafts remain excluded.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await prepareContent(fileURLToPath(new URL('../', import.meta.url)));
}
