import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { isPublished, splitNote } from './markdown.mjs';

// Resolve Obsidian drawing embeds to their SVG exports. Resource pages can
// override the default sibling SVG path with their existing diagram metadata.
export async function diagramResolver(root, notes) {
  const directory = path.join(root, 'content');
  const drawings = new Map();
  const aliases = new Map();
  async function scan(folder) {
    let entries;
    try { entries = await readdir(folder, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) { await scan(filename); continue; }
      if (!entry.isFile() || !entry.name.endsWith('.excalidraw.md')) continue;
      const original = path.relative(directory, filename).split(path.sep).join('/');
      const key = original.replace(/\.md$/, '').toLowerCase();
      const resource = notes.find(note => note.kind === 'resource' && note.original === original);
      const data = splitNote(await readFile(filename, 'utf8')).data;
      drawings.set(key, {
        original,
        diagram: resource?.diagram ?? original.replace(/\.excalidraw\.md$/, '.svg'),
        published: isPublished(data),
      });
      const basename = path.posix.basename(key);
      aliases.set(basename, aliases.has(basename) ? null : key);
    }
  }
  await scan(path.join(directory, 'Diagrams'));
  return file => {
    if (!/\.excalidraw(?:\.md)?$/i.test(file)) return undefined;
    const key = file.replaceAll('\\', '/').replace(/\.md$/i, '').toLowerCase();
    const alias = aliases.get(key);
    if (alias === null) throw new Error(`Ambiguous drawing: ${file}. Use its full path from content/.`);
    const drawing = drawings.get(key) ?? drawings.get(alias);
    if (!drawing) throw new Error(`Missing drawing: ${file}. Store its .excalidraw.md file in content/Diagrams/.`);
    if (!drawing.published) throw new Error(`Drawing is unpublished: ${drawing.original}`);
    return drawing;
  };
}
