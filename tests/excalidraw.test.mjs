import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadDrawing } from '../scripts/excalidraw.mjs';

const directories = {
  resourceDirectory: fileURLToPath(new URL('../content/Diagrams/', import.meta.url)),
  attachmentDirectory: fileURLToPath(new URL('../content/Attachments/', import.meta.url)),
};

test('low-level Windows drawing includes both Obsidian-linked screenshots', async () => {
  const source = await readFile(new URL('../content/Diagrams/DrawingLowLevelStructures.excalidraw.md', import.meta.url), 'utf8');
  const drawing = await loadDrawing(source, directories);
  const images = drawing.elements.filter(element => element.type === 'image' && !element.isDeleted);
  assert.equal(images.length, 2);
  for (const [id, name] of [
    ['5ab2607e4b3c25aff849f58092b486079e194027', 'EprocessStructures.png'],
    ['460cde07e7cc11a31b7816c4e699d9f59580285e', 'ProcessHandleObjects.png'],
  ]) {
    const expected = await readFile(new URL(`../content/Attachments/${name}`, import.meta.url));
    assert.equal(drawing.files[id].dataURL, `data:image/png;base64,${expected.toString('base64')}`);
    assert.equal(images.find(image => image.fileId === id).status, 'saved');
  }
});

test('export fails when a live image has no available file', async () => {
  const scene = { elements: [{ id: 'example', type: 'image', fileId: 'abc123' }], files: {} };
  const source = `## Embedded Files\nabc123: [[missing-image.png]]\n\n\`\`\`json\n${JSON.stringify(scene)}\n\`\`\``;
  await assert.rejects(loadDrawing(source, directories), /Missing embedded image attachment: missing-image.png/);
});
