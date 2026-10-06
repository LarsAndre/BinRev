import { readFile } from 'node:fs/promises';
import path from 'node:path';
import LZString from 'lz-string';

// Obsidian stores linked image files outside the compressed Excalidraw scene.
// Resolve them into BinaryFiles before exporting instead of silently omitting them.
export async function loadDrawing(markdown, { resourceDirectory, attachmentDirectory }) {
  const match = markdown.match(/```(compressed-json|json)\s*\n([\s\S]*?)\n```/);
  if (!match) throw new Error('No Excalidraw drawing data found');
  const data = match[1] === 'compressed-json'
    ? LZString.decompressFromBase64(match[2].replace(/\s/g, '')) : match[2];
  const drawing = JSON.parse(data);
  drawing.files ||= {};
  const references = new Map([...markdown.matchAll(/^([a-f\d]+):\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/gm)]
    .map((match) => [match[1], match[2]]));
  for (const element of drawing.elements) {
    if (element.type !== 'image' || element.isDeleted) continue;
    const id = element.fileId;
    if (!id) throw new Error(`Image element ${element.id} has no file ID`);
    if (!drawing.files[id]?.dataURL) {
      const reference = references.get(id);
      if (!reference) throw new Error(`Missing embedded image reference: ${id}`);
      const name = path.basename(reference);
      const mimeType = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' }[path.extname(name).toLowerCase()];
      if (!mimeType) throw new Error(`Unsupported embedded image: ${reference}`);
      let bytes;
      for (const directory of [resourceDirectory, attachmentDirectory]) {
        try { bytes = await readFile(path.join(directory, name)); break; }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      if (!bytes) throw new Error(`Missing embedded image attachment: ${reference}`);
      drawing.files[id] = { id, mimeType, dataURL: `data:${mimeType};base64,${bytes.toString('base64')}`, created: 0 };
    }
    element.status = 'saved';
  }
  return drawing;
}
