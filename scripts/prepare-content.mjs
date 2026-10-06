import { mkdir, readdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertMarkdown, splitNote, isPublished } from './markdown.mjs';
import { redirects } from './redirects.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'content');
const output = path.join(root, 'src/content/analyses');
const attachments = new Set(await readdir(path.join(source, 'Attachments')));
const files = (await readdir(path.join(source, '02-Analyzed-Samples'))).filter((name) => name.endsWith('.md'));
const notes = await Promise.all(files.map(async (name) => ({
  name, source: await readFile(path.join(source, '02-Analyzed-Samples', name), 'utf8'),
})));
const routes = new Map([
  ['malloaderflow', '/resources/malware-loader-flow/'],
  ['drawinglowlevelstructures', '/resources/low-level-structures/'],
  ['pe_format_overview', '/resources/pe-format/'],
]);
for (const note of notes) {
  if (isPublished(splitNote(note.source).data)) {
    const id = note.name.replace(/\.md$/, '').toLowerCase();
    routes.set(id, `/analyses/${id}/`);
  }
}
// Keep the note directory in place so Astro's running glob watcher remains valid.
// Remove stale drafts individually; never leave a previously published draft behind.
await mkdir(output, { recursive: true });
const publishedFiles = new Set(notes.filter(note => isPublished(splitNote(note.source).data)).map(note => note.name.toLowerCase()));
for (const name of await readdir(output)) {
  if (!publishedFiles.has(name)) await rm(path.join(output, name), { recursive: true, force: true });
}
// Vite watches public directories and indexes their files. Preserve directories
// and unchanged files so preparing content while dev is running keeps images live.
// Prune stale assets individually so unpublished attachments remain excluded.
async function syncAssets(directory, sources) {
  await mkdir(directory, { recursive: true });
  for (const name of await readdir(directory)) {
    if (!sources.has(name)) await rm(path.join(directory, name), { recursive: true, force: true });
  }
  for (const [name, sourcePath] of sources) {
    const content = await readFile(sourcePath);
    const destination = path.join(directory, name);
    let previous;
    try { previous = await readFile(destination); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!previous?.equals(content)) await writeFile(destination, content);
  }
}
const publishedImages = new Map();
for (const note of notes) {
  if (!isPublished(splitNote(note.source).data)) continue;
  const result = convertMarkdown(note.source, { routes, attachments });
  const destination = path.join(output, note.name.toLowerCase());
  let previous;
  try { previous = await readFile(destination, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous !== result.markdown) await writeFile(destination, result.markdown);
  for (const image of result.images) {
    publishedImages.set(image, path.join(source, 'Attachments', image));
  }
  for (const warning of result.warnings) console.warn(`${note.name}: ${warning}`);
}
await syncAssets(path.join(root, 'public/attachments'), publishedImages);
await mkdir(path.join(root, 'public/diagrams'), { recursive: true });
await copyFile(path.join(source, '01-Resources/PE_Format_Overview.svg'), path.join(root, 'public/diagrams/pe-format.svg'));
await syncAssets(path.join(root, 'public/originals'), new Map(
  ['MalLoaderFlow.excalidraw.md', 'DrawingLowLevelStructures.excalidraw.md']
    .map(name => [name, path.join(source, '01-Resources', name)]),
));
for (const name of ['malware-loader-flow.svg', 'low-level-structures.svg']) {
  await readFile(path.join(root, 'public/diagrams', name));
}
await writeFile(path.join(root, 'public/_redirects'), [
  ...Object.entries(redirects).map(([from, to]) => `${from} ${to} 301`),
  '/01-Resources/PE_Format_Overview.svg /diagrams/pe-format.svg 301',
  '/01-resources/pe_format_overview.svg /diagrams/pe-format.svg 301',
  '/01-resources/PE_Format_Overview.svg /diagrams/pe-format.svg 301',
  '/Attachments/* /attachments/:splat 301',
].join('\n') + '\n');
console.log(`Prepared ${notes.length} notes; ${routes.size - 3} published analyses. Drafts remain excluded.`);
